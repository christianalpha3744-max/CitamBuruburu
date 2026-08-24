/**
 * CITAM Buruburu Events — Load and render CMS-managed events
 *
 * Local testing:  reads content/events/ via the dev server's directory listing
 * Production:     lists content/events/ through the public GitHub Contents API
 *                 (raw.githubusercontent.com cannot list directories, so the
 *                 Contents API is used for discovery, then raw URLs for content)
 */

const REPO_OWNER = "christianalpha3744-max";
const REPO_NAME = "CitamBuruburu";
const REPO_BRANCH = "main";
const GITHUB_API_EVENTS_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/content/events`;
const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/content/events`;
const LOCAL_EVENTS_PATH = "content/events";

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { attributes: {}, body: content || "" };

  const attributes = {};
  const lines = match[1].split(/\r?\n/);

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    if (!key) continue;

    let value = line.slice(colonIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    attributes[key] = value;
  }

  return { attributes, body: match[2] || "" };
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function formatEventDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  if (isNaN(date.getTime())) return escapeHtml(dateString);

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";

  return `${day}${suffix} ${month} ${year}`;
}

function formatEventTime(timeString) {
  if (!timeString) return "";
  return escapeHtml(timeString);
}

async function fetchEventFiles() {
  // 1. Local development: python http.server / serve.sh expose a real
  //    directory listing we can scrape for .md links.
  try {
    const response = await fetch(LOCAL_EVENTS_PATH + "/?t=" + Date.now());
    if (response.ok) {
      const contentType = response.headers.get("Content-Type") || "";
      if (contentType.includes("text/html")) {
        const text = await response.text();
        const matches = text.match(/href="([^"]+\.md)"/g) || [];
        const names = matches
          .map((p) => p.match(/href="([^"]+)"/)[1].split("/").pop())
          .filter((name) => !name.startsWith("."));
        if (names.length > 0) {
          return names.map((name) => ({ url: `${LOCAL_EVENTS_PATH}/${name}` }));
        }
      }
    }
  } catch (e) {
    console.warn("Local directory listing failed:", e);
  }

  // 2. Production: GitHub Contents API returns JSON with one entry per file.
  try {
    const response = await fetch(GITHUB_API_EVENTS_URL + "?t=" + Date.now());
    if (response.ok) {
      const entries = await response.json();
      if (Array.isArray(entries)) {
        return entries
          .filter((entry) => entry.type === "file" && entry.name.endsWith(".md"))
          .map((entry) => ({
            url: entry.download_url || `${GITHUB_RAW_BASE_URL}/${entry.name}`,
          }));
      }
    }
  } catch (e) {
    console.warn("GitHub API listing failed:", e);
  }

  return [];
}

async function fetchEventMarkdown(file) {
  try {
    const response = await fetch(file.url + "?t=" + Date.now());
    if (response.ok) {
      return await response.text();
    }
  } catch (e) {
    console.warn("Failed to load event:", file.url, e);
  }
  return null;
}

async function loadEvents() {
  const upcomingContainer = document.getElementById("upcoming-events");
  if (!upcomingContainer) return;

  const files = await fetchEventFiles();

  const events = [];

  for (const file of files) {
    const content = await fetchEventMarkdown(file);
    if (!content) continue;

    const { attributes } = parseFrontmatter(content);

    if (attributes.status !== "published") continue;

    const event = {
      title: attributes.title || "Untitled Event",
      date: attributes.date || "",
      startTime: attributes.startTime || "",
      endTime: attributes.endTime || "",
      location: attributes.location || "",
      description: attributes.description || "",
      image: attributes.image || "",
      registrationUrl: attributes.registrationUrl || ""
    };

    const parsed = new Date(event.date + "T00:00:00");
    if (!isNaN(parsed.getTime())) {
      events.push(event);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events
    .filter((e) => new Date(e.date + "T00:00:00") >= today)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  renderEvents(upcomingContainer, upcoming);
}

function renderEventCard(event) {
  const article = document.createElement("article");
  article.className = "event-card";

  let imageHtml;
  if (event.image) {
    imageHtml = `<div class="event-card-image"><img src="${escapeHtml(event.image)}" alt="${escapeHtml(event.title)}" loading="lazy" /></div>`;
  } else {
    imageHtml = `
      <div class="event-card-image event-card-image-fallback">
        <div class="event-card-fallback-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </div>
      </div>
    `;
  }

  const timeDisplay = event.startTime
    ? event.endTime
      ? `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`
      : formatEventTime(event.startTime)
    : "";

  const registrationHtml = event.registrationUrl
    ? `<a href="${escapeHtml(event.registrationUrl)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">REGISTER</a>`
    : "";

  article.innerHTML = `
    ${imageHtml}
    <div class="event-card-body">
      <div class="event-card-meta">
        <span class="event-card-date">${formatEventDate(event.date)}</span>
        ${timeDisplay ? `<span class="event-card-time">${timeDisplay}</span>` : ""}
        ${event.location ? `<span class="event-card-location">${escapeHtml(event.location)}</span>` : ""}
      </div>
      <h3>${escapeHtml(event.title)}</h3>
      <p class="event-card-description">${escapeHtml(event.description)}</p>
      <div class="event-card-actions">
        ${registrationHtml}
      </div>
    </div>
  `;

  return article;
}

function renderEvents(container, upcoming) {
  container.innerHTML = "";

  if (upcoming.length === 0) {
    container.innerHTML = '<p class="muted" style="font-size: 1.05rem;">No upcoming events at the moment.</p>';
    return;
  }

  const list = document.createElement("div");
  list.className = "events-list";
  upcoming.forEach((event) => {
    list.appendChild(renderEventCard(event));
  });
  container.appendChild(list);
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("upcoming-events")) {
    loadEvents();
  }
});
