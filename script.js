/**
 * CITAM Buruburu Website Main JavaScript
 * Clean, lightweight, vanilla JavaScript implementation
 */

/* YouTube Sermons Configuration */
const YOUTUBE_API_KEY = "AIzaSyBO-YXbWu3qXf0iKJ8m8_XbkOhoJXKfTK0";
const YOUTUBE_CHANNEL_ID = "UCj3OB9i31wQ3-DUdK6x-Vuw";

const SERMON_CATEGORIES = {
  sunday: "Sunday Message",
  prayer: "Prayer Series",
  teaching: "Teaching"
};

const CATEGORY_KEYWORDS = [
  { keywords: ["prayer", "fasting", "intercession", "presence"], category: "prayer" },
  { keywords: ["sunday", "service", "worship", "sermon"], category: "sunday" },
  { keywords: ["teaching", "bible study", "word", "purpose", "family", "home", "message"], category: "teaching" }
];

let currentPageToken = null;
let isLoadingMore = false;

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeaderScroll();
  initActiveLinks();
  initDynamicYear();
  initScrollAnimations();
  initCounterAnimations();
  initForms();
  initSermonFilters();
  initCopyButtons();
  
  if (document.getElementById("sermons-grid")) {
    loadYouTubeSermons();
    initLoadMore();
  }
  
  if (document.getElementById("featured-sermon-main") || document.getElementById("sermon-side-list")) {
    loadFeaturedSermons();
  }
});

/* Mobile Menu Navigation */
function initMobileNav() {
  const navToggle = document.querySelector('.nav-toggle');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');

  if (!navToggle || !mobileOverlay) return;

  navToggle.addEventListener('click', () => {
    const isOpen = mobileOverlay.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.innerHTML = isOpen ? '✕' : '☰';
  });

  // Close mobile nav when clicking a link
  const mobileLinks = mobileOverlay.querySelectorAll('a');
  mobileLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileOverlay.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.innerHTML = '☰';
    });
  });
}

/* Header Scroll Transition */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 40) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* Set Active Class on Current Page Nav Items */
function initActiveLinks() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.main-nav a, .mobile-nav-overlay a');

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/* Dynamic Copyright Year */
function initDynamicYear() {
  const yearElements = document.querySelectorAll('[data-year]');
  const currentYear = new Date().getFullYear();

  yearElements.forEach(el => {
    el.textContent = currentYear;
  });
}

/* Scroll Reveal Animations via IntersectionObserver */
function initScrollAnimations() {
  const revealItems = document.querySelectorAll('.reveal');
  if (!revealItems.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealItems.forEach(item => observer.observe(item));
}

/* Number Counters Animation */
function initCounterAnimations() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      const target = parseInt(el.getAttribute('data-count'), 10) || 0;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 40));

      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          el.textContent = target.toLocaleString() + '+';
          clearInterval(timer);
        } else {
          el.textContent = current.toLocaleString() + '+';
        }
      }, 30);

      counterObserver.unobserve(el);
    });
  }, { threshold: 0.3 });

  counters.forEach(counter => counterObserver.observe(counter));
}

/* Vanilla Form Handling & Basic Validation */
function initForms() {
  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const notice = form.querySelector('.form-notice');
      let isValid = true;

      const requiredInputs = form.querySelectorAll('[required]');
      requiredInputs.forEach(input => {
        if (!input.value.trim()) {
          isValid = false;
          input.style.borderColor = '#ef4444';
        } else {
          input.style.borderColor = '';
        }
      });

      if (!isValid) {
        if (notice) {
          notice.className = 'form-notice error';
          notice.textContent = 'Please fill out all required fields.';
        }
        return;
      }

      // Successful simulated submission
      if (notice) {
        notice.className = 'form-notice success';
        notice.textContent = 'Thank you! Your request has been received.';
      }

      form.reset();

      setTimeout(() => {
        if (notice) notice.className = 'form-notice';
      }, 5000);
    });
  });
}

/* Simple Sermon Filter & Search (For sermons.html) */
function initSermonFilters() {
  const searchInput = document.getElementById("sermon-search");
  const categorySelect = document.getElementById("sermon-category");

  if (!searchInput && !categorySelect) return;

  function filterSermons() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const selectedCategory = categorySelect ? categorySelect.value.toLowerCase() : "all";
    const sermonCards = document.querySelectorAll(".sermon-card[data-category]");

    sermonCards.forEach(card => {
      const title = card.querySelector("h3") ? card.querySelector("h3").textContent.toLowerCase() : "";
      const category = card.getAttribute("data-category").toLowerCase();
      const speaker = card.querySelector(".sermon-speaker") ? card.querySelector(".sermon-speaker").textContent.toLowerCase() : "";

      const matchesSearch = title.includes(searchTerm) || speaker.includes(searchTerm);
      const matchesCategory = selectedCategory === "all" || category === selectedCategory;

      if (matchesSearch && matchesCategory) {
        card.style.display = "flex";
      } else {
        card.style.display = "none";
      }
    });
  }

  if (searchInput) searchInput.addEventListener("input", filterSermons);
  if (categorySelect) categorySelect.addEventListener("change", filterSermons);
}

/* ==========================================================================
   YOUTUBE SERMONS
   ========================================================================== */

function formatDate(dateString) {
  const date = new Date(dateString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text || "";
  return div.innerHTML;
}

function categorizeVideo(title, description) {
  const text = (title + " " + description).toLowerCase();
  
  for (const group of CATEGORY_KEYWORDS) {
    if (group.keywords.some(keyword => text.includes(keyword))) {
      return group.category;
    }
  }
  
  return "sunday";
}

function isSermonVideo(title, description) {
  const text = (title + " " + description).toLowerCase();
  return CATEGORY_KEYWORDS.some(group =>
    group.keywords.some(keyword => text.includes(keyword))
  );
}

function renderSermonCard(video) {
  const article = document.createElement("article");
  article.className = "sermon-card";
  
  const category = categorizeVideo(video.snippet.title, video.snippet.description);
  article.setAttribute("data-category", category);
  
  const categoryLabel = SERMON_CATEGORIES[category] || "Sunday Message";
  const date = formatDate(video.snippet.publishedAt);
  const title = escapeHtml(video.snippet.title);
  const description = escapeHtml(video.snippet.description.substring(0, 140));
  const thumbnails = video.snippet.thumbnails;
  const imageUrl = thumbnails.high ? thumbnails.high.url : (thumbnails.medium ? thumbnails.medium.url : thumbnails.default.url);
  const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
  
  article.innerHTML = `
    <div class="sermon-card-image">
      <img src="${imageUrl}" alt="${title}" loading="lazy" />
    </div>
    <div class="sermon-card-body">
      <div class="sermon-meta">
        <span>${categoryLabel}</span> • <span class="sermon-speaker">CITAM Buruburu</span> • <span>${date}</span>
      </div>
      <h3>${title}</h3>
      <p>${description}</p>
      <a href="${videoUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">WATCH SERMON</a>
    </div>
  `;
  
  return article;
}

async function getYouTubeVideos(pageToken = "") {
  const params = new URLSearchParams({
    part: "snippet",
    channelId: YOUTUBE_CHANNEL_ID,
    maxResults: "12",
    order: "date",
    type: "video",
    key: YOUTUBE_API_KEY
  });
  
  if (pageToken) {
    params.set("pageToken", pageToken);
  }
  
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  
  if (!response.ok) {
    throw new Error("YouTube API request failed");
  }
  
  return response.json();
}

async function loadYouTubeSermons(isLoadMore = false) {
  const grid = document.getElementById("sermons-grid");
  const loadingEl = document.getElementById("sermons-loading");
  const errorEl = document.getElementById("sermons-error");
  const emptyEl = document.getElementById("sermons-empty");
  const loadMoreContainer = document.getElementById("sermons-load-more");
  const loadMoreBtn = document.getElementById("load-more-btn");
  
  if (!grid) return;
  
  if (!isLoadMore) {
    if (loadingEl) loadingEl.style.display = "block";
    if (errorEl) errorEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";
    currentPageToken = null;
  }
  
  if (isLoadMore) {
    isLoadingMore = true;
    if (loadMoreBtn) {
      loadMoreBtn.textContent = "Loading...";
      loadMoreBtn.disabled = true;
    }
  }
  
  try {
    const data = await getYouTubeVideos(currentPageToken || "");
    
    if (!data.items || data.items.length === 0) {
      if (!isLoadMore) {
        if (loadingEl) loadingEl.style.display = "none";
        if (emptyEl) emptyEl.style.display = "block";
      }
      if (loadMoreContainer) loadMoreContainer.style.display = "none";
      return;
    }
    
    const sermonItems = data.items.filter(item =>
      isSermonVideo(item.snippet.title, item.snippet.description)
    );
    
    currentPageToken = data.nextPageToken || null;
    
    if (!isLoadMore) {
      if (loadingEl) loadingEl.style.display = "none";
      const existingCards = grid.querySelectorAll(".sermon-card");
      existingCards.forEach(card => card.remove());
    }
    
    sermonItems.forEach(item => {
      const card = renderSermonCard(item);
      grid.appendChild(card);
    });
    
    if (currentPageToken && sermonItems.length > 0) {
      if (loadMoreContainer) loadMoreContainer.style.display = "block";
      if (loadMoreBtn) {
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.disabled = false;
      }
    } else {
      if (loadMoreContainer) loadMoreContainer.style.display = "none";
    }
    
  } catch (error) {
    console.error("Failed to load sermons:", error);
    if (!isLoadMore) {
      if (loadingEl) loadingEl.style.display = "none";
      if (errorEl) errorEl.style.display = "block";
    }
    if (loadMoreContainer) loadMoreContainer.style.display = "none";
  } finally {
    isLoadingMore = false;
  }
}

function initLoadMore() {
  const loadMoreBtn = document.getElementById("load-more-btn");
  if (!loadMoreBtn) return;
  
  loadMoreBtn.addEventListener("click", () => {
    if (!isLoadingMore && currentPageToken) {
      loadYouTubeSermons(true);
    }
  });
}

/* ==========================================================================
   HOME PAGE FEATURED SERMONS
   ========================================================================== */

function renderFeaturedSermon(video) {
  const container = document.getElementById("featured-sermon-main");
  if (!container) return;
  
  const category = categorizeVideo(video.snippet.title, video.snippet.description);
  const categoryLabel = SERMON_CATEGORIES[category] || "Sunday Message";
  const date = formatDate(video.snippet.publishedAt);
  const title = escapeHtml(video.snippet.title);
  const description = escapeHtml(video.snippet.description.substring(0, 140));
  const thumbnails = video.snippet.thumbnails;
  const imageUrl = thumbnails.high ? thumbnails.high.url : (thumbnails.medium ? thumbnails.medium.url : thumbnails.default.url);
  const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
  
  container.innerHTML = `
    <article class="featured-sermon-main">
      <div class="sermon-hero-image">
        <img src="${imageUrl}" alt="${title} Sermon" />
        <span class="sermon-badge-featured">FEATURED SERMON</span>
      </div>
      <div class="sermon-hero-body">
        <div class="sermon-meta">
          <span>${categoryLabel}</span> • <span class="sermon-speaker">CITAM Buruburu</span> • <span>${date}</span>
        </div>
        <h3>${title}</h3>
        <p>${description}</p>
        <a href="${videoUrl}" target="_blank" rel="noopener" class="btn btn-primary">WATCH FEATURED SERMON</a>
      </div>
    </article>
  `;
}

function renderMiniCard(video) {
  const container = document.getElementById("sermon-side-list");
  if (!container) return;
  
  const category = categorizeVideo(video.snippet.title, video.snippet.description);
  const categoryLabel = SERMON_CATEGORIES[category] || "Sunday Message";
  const date = formatDate(video.snippet.publishedAt);
  const title = escapeHtml(video.snippet.title);
  const description = escapeHtml(video.snippet.description.substring(0, 100));
  const thumbnails = video.snippet.thumbnails;
  const imageUrl = thumbnails.high ? thumbnails.high.url : (thumbnails.medium ? thumbnails.medium.url : thumbnails.default.url);
  const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
  
  const article = document.createElement("article");
  article.className = "sermon-mini-card";
  article.innerHTML = `
    <div class="sermon-mini-image">
      <img src="${imageUrl}" alt="${title}" loading="lazy" />
    </div>
    <div class="sermon-mini-body">
      <span class="sermon-mini-meta">${date} • ${categoryLabel}</span>
      <h4>${title}</h4>
      <p>${description}</p>
      <a href="${videoUrl}" target="_blank" rel="noopener" class="link-btn">WATCH SERMON →</a>
    </div>
  `;
  
  container.appendChild(article);
}

async function loadFeaturedSermons() {
  const featuredContainer = document.getElementById("featured-sermon-main");
  const sideListContainer = document.getElementById("sermon-side-list");
  
  if (!featuredContainer && !sideListContainer) return;
  
  try {
    const data = await getYouTubeVideos("");
    
    if (!data.items || data.items.length === 0) {
      if (featuredContainer) {
        featuredContainer.innerHTML = `<p style="padding: 2rem; text-align: center; color: #6b7280;">No sermons available right now.</p>`;
      }
      return;
    }
    
    const sermonItems = data.items.filter(item =>
      isSermonVideo(item.snippet.title, item.snippet.description)
    );
    
    if (sermonItems.length === 0) {
      if (featuredContainer) {
        featuredContainer.innerHTML = `<p style="padding: 2rem; text-align: center; color: #6b7280;">No sermons available right now.</p>`;
      }
      return;
    }
    
    renderFeaturedSermon(sermonItems[0]);
    
    const supportingSermons = sermonItems.slice(1, 3);
    supportingSermons.forEach(video => renderMiniCard(video));
    
  } catch (error) {
    console.error("Failed to load featured sermons:", error);
    if (featuredContainer) {
      featuredContainer.innerHTML = `<p style="padding: 2rem; text-align: center; color: #6b7280;">Unable to load sermons right now. Please try again later.</p>`;
    }
  }
}

/* ==========================================================================
   COPY BUTTONS
   ========================================================================== */

function initCopyButtons() {
  const copyButtons = document.querySelectorAll(".copy-btn");
  
  copyButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const textToCopy = button.getAttribute("data-copy");
      const originalText = button.textContent;
      
      try {
        await navigator.clipboard.writeText(textToCopy);
        button.textContent = "Copied!";
        button.style.backgroundColor = "#16a34a";
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = "";
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
        button.textContent = "Failed";
        button.style.backgroundColor = "#ef4444";
        
        setTimeout(() => {
          button.textContent = originalText;
          button.style.backgroundColor = "";
        }, 2000);
      }
    });
  });
}
