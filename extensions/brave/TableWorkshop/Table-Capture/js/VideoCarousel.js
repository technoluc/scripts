// Globals
let youtubeReady = false;
const players = [];

// NOTE(gmike): This gets magically called.
function onYouTubeIframeAPIReady() {
  jQuery(".youtube-video").each((i, obj) => {
    players[obj.id] = new YT.Player(obj.id, {
      videoId: obj.id,
      playerVars: {
        controls: 2,
        rel: 0,
        autohide: 1,
        showinfo: 0,
        modestbranding: 1,
        wmode: "transparent",
        html5: 1,
      },
      events: {
        onStateChange: (event) => {
          const targetControl = jQuery(event.target.getIframe())
            .parent()
            .parent()
            .parent()
            .find(".controls");
          const targetCaption = jQuery(event.target.getIframe())
            .parent()
            .find(".carousel-caption");

          switch (event.data) {
            case -1:
              jQuery(targetControl).fadeIn(500);
              jQuery(targetControl).children().unbind("click");
              break;
            case 0:
              jQuery(targetControl).fadeIn(500);
              jQuery(targetControl).children().unbind("click");
              break;
            case 1:
              jQuery(targetControl)
                .children()
                .click(function () {
                  return false;
                });
              jQuery(targetCaption).fadeOut(500);
              jQuery(targetControl).fadeOut(500);
              break;
            case 2:
              jQuery(targetControl).fadeIn(500);
              jQuery(targetControl).children().unbind("click");
              break;
            case 3:
              jQuery(targetControl)
                .children()
                .click(function () {
                  return false;
                });
              jQuery(targetCaption).fadeOut(500);
              jQuery(targetControl).fadeOut(500);
              break;
            case 5:
              jQuery(targetControl)
                .children()
                .click(function () {
                  return false;
                });
              jQuery(targetCaption).fadeOut(500);
              jQuery(targetControl).fadeOut(500);
              break;
            default:
              break;
          }
        },
      },
    });
  });
  youtubeReady = true;
}

document.addEventListener("DOMContentLoaded", () => {
  const videos = [
    [
      {
        id: "ddtrHQ75yaA",
        title: "2023: Welcome to Table Capture!",
      },
    ],
    [
      {
        id: "z2dqA0W4qVc",
        title:
          "Capturing an infinitely-scrolling StubHub.com &lt;div&gt; table",
      },
    ],
    [
      {
        id: "RYkB2K-Wk-0",
        title: "Capturing repeated page elements (&lt;div&gt; tables)",
      },
    ],
  ];

  const carouselInner = document.querySelector(
    "#vid-carousel-1 .carousel-inner"
  );
  videos.forEach((video, i) => {
    const videoContainer = document.createElement("div");
    videoContainer.classList.add("video-container");
    videoContainer.classList.add("item");
    if (i === 0) {
      videoContainer.classList.add("active");
    }
    videoContainer.innerHTML = `
      <div class="youtube-video" id="${video[0].id}"></div>
      <div class="carousel-caption">
        ${video[0].title}
      </div>
    `;
    carouselInner.appendChild(videoContainer);
  });

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName("script")[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  jQuery(".carousel-caption").fadeIn(500);
  jQuery(".controls").fadeIn(500);
  jQuery(".carousel").bind("slid.bs.carousel", () => {
    jQuery(".controls").fadeIn(500);
  });
});
