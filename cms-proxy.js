#!/usr/bin/env node
/**
 * Decap CMS GitHub OAuth Proxy Server
 *
 * Handles GitHub OAuth token exchange and proxies API requests.
 * Used for local development with GitHub backend authentication.
 *
 * Setup:
 *   1. Copy .env.example to .env
 *   2. Add your GitHub OAuth App credentials
 *   3. Run: node cms-proxy.js
 *   4. Open: http://localhost:8081
 */

require("dotenv").config();
const express = require("express");
const session = require("express-session");
const fetch = require("node-fetch");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 8081;
const PROJECT_ROOT = process.cwd();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_REPO = process.env.GITHUB_REPO || "christian/citam-buruburu-web";
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
  })
);

function generateState() {
  return crypto.randomBytes(16).toString("hex");
}

app.get("/auth/github/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        state,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.status(400).send(`OAuth error: ${tokenData.error_description || tokenData.error}`);
    }

    req.session.github_token = tokenData.access_token;
    req.session.save((err) => {
      if (err) {
        return res.status(500).send("Session save error");
      }
      res.redirect("/");
    });
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send("Authentication failed");
  }
});

app.get("/auth/github", (req, res) => {
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).send("Missing GITHUB_CLIENT_ID in environment");
  }

  const state = generateState();
  req.session.oauth_state = state;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `http://localhost:${PORT}/auth/github/callback`,
    scope: "repo",
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/api/v1/status", (req, res) => {
  res.json({
    status: "ok",
    authenticated: !!req.session.github_token,
    repo: GITHUB_REPO,
    branch: GITHUB_BRANCH,
  });
});

app.get("/api/v1/collections/:collectionName/entries", async (req, res) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { collectionName } = req.params;
    const folder = collectionName;

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${folder}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return res.json([]);
      }
      return res.status(response.status).json({ error: "GitHub API error" });
    }

    const data = await response.json();
    const entries = data
      .filter((item) => item.type === "file" && item.name.endsWith(".md"))
      .map((item) => ({
        slug: item.name.replace(/\.md$/, ""),
        path: item.path,
        sha: item.sha,
      }));

    res.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({ error: "Failed to fetch entries" });
  }
});

app.get("/api/v1/collections/:collectionName/entries/:slug", async (req, res) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { collectionName, slug } = req.params;
    const filePath = `${collectionName}/${slug}.md`;

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Entry not found" });
    }

    const data = await response.json();
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    res.json({
      slug,
      path: data.path,
      sha: data.sha,
      content,
    });
  } catch (error) {
    console.error("Error fetching entry:", error);
    res.status(500).json({ error: "Failed to fetch entry" });
  }
});

app.post("/api/v1/collections/:collectionName/entries", async (req, res) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { collectionName } = req.params;
    const { slug, content, sha } = req.body;
    const filePath = `${collectionName}/${slug}.md`;

    const encodedContent = Buffer.from(content).toString("base64");

    const body = {
      message: sha ? `Update ${slug}` : `Create ${slug}`,
      content: encodedContent,
      branch: GITHUB_BRANCH,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ error: errorData.message || "GitHub API error" });
    }

    const data = await response.json();
    res.json({
      slug,
      path: data.content.path,
      sha: data.content.sha,
    });
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({ error: "Failed to create entry" });
  }
});

app.delete("/api/v1/collections/:collectionName/entries/:slug", async (req, res) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { collectionName, slug } = req.params;
    const filePath = `${collectionName}/${slug}.md`;

    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=${GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!getResponse.ok) {
      return res.status(getResponse.status).json({ error: "Entry not found" });
    }

    const getData = await getResponse.json();

    const deleteResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Delete ${slug}`,
          sha: getData.sha,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!deleteResponse.ok) {
      return res.status(deleteResponse.status).json({ error: "Failed to delete entry" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

app.post("/api/v1/upload", async (req, res) => {
  if (!req.session.github_token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { file, path: uploadPath } = req.body;

    if (!file || !uploadPath) {
      return res.status(400).json({ error: "Missing file or path" });
    }

    const encodedContent = Buffer.from(file).toString("base64");

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${uploadPath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${req.session.github_token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          message: `Upload ${uploadPath}`,
          content: encodedContent,
          branch: GITHUB_BRANCH,
        }),
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to upload file" });
    }

    const data = await response.json();
    res.json({
      path: data.content.path,
      url: data.content.html_url,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` Decap CMS Proxy Server`);
  console.log(`========================================`);
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log(`  CMS:      http://localhost:8000/admin/`);
  console.log(`  Repo:    ${GITHUB_REPO}`);
  console.log(`  Branch:  ${GITHUB_BRANCH}`);
  console.log(`\n  Auth: http://localhost:${PORT}/auth/github`);
  console.log(`  Logout: http://localhost:${PORT}/logout`);
  console.log(`========================================\n`);
});
