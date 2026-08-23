const YOUTUBE_API_KEY = "AIzaSyBO-YXbWu3qXf0iKJ8m8_XbkOhoJXKfTK0";

const CHANNEL_ID =
  "UCj3OB9i31wQ3-DUdK6x-Vuw";

const CHECK_INTERVAL = 60000;

let currentVideoId = null;


async function checkLiveStream() {

  try {

    const url =
      "https://www.googleapis.com/youtube/v3/search" +
      "?part=snippet" +
      "&channelId=" + encodeURIComponent(CHANNEL_ID) +
      "&eventType=live" +
      "&type=video" +
      "&maxResults=1" +
      "&key=" + encodeURIComponent(YOUTUBE_API_KEY);

    const response = await fetch(url);

    if (!response.ok) {

      const errorData = await response.json().catch(() => null);

      console.error("YouTube API error:", errorData);

      showError("Unable to check the YouTube livestream.");

      return;
    }

    const data = await response.json();

    console.log("YouTube API response:", data);


    if (!data.items || data.items.length === 0) {

      currentVideoId = null;

      showOffline();

      return;
    }


    const videoId =
      data.items[0].id.videoId;

    const title =
      data.items[0].snippet.title;


    if (videoId !== currentVideoId) {

      currentVideoId = videoId;

      showLiveStream(videoId, title);

    }

  }

  catch (error) {

    console.error("Request failed:", error);

    showError("Unable to connect to YouTube.");

  }

}


function showLiveStream(videoId, title) {

  document.getElementById("status").innerHTML =
    '<span class="live-badge">● LIVE NOW</span>';


  document.getElementById("liveArea").innerHTML = `

    <div class="player">

      <iframe
        src="https://www.youtube.com/embed/${videoId}"
        title="CITAM Buruburu Live Stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin">
      </iframe>

    </div>

    <div class="video-title">
      ${escapeHtml(title)}
    </div>

  `;

}


function showOffline() {

  document.getElementById("status").textContent =
    "Currently offline";


  document.getElementById("liveArea").innerHTML = `

    <div class="offline">

      <h2>We're currently offline</h2>

      <p>
        Our next live service will appear here when
        CITAM Buruburu goes live.
      </p>

    </div>

  `;

}


function showError(message) {

  document.getElementById("status").textContent =
    "Livestream check failed";


  document.getElementById("liveArea").innerHTML = `

    <div class="error">
      ${escapeHtml(message)}
    </div>

  `;

}


function escapeHtml(text) {

  const div = document.createElement("div");

  div.textContent = text || "";

  return div.innerHTML;

}


checkLiveStream();

setInterval(
  checkLiveStream,
  CHECK_INTERVAL
);