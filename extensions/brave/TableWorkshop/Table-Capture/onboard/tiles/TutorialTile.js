const tutorialEntries = [
  {
    id: "tutorial-intro",
    title: "Tutorial overview",
  },
  {
    id: "mech",
    title: "Basic mechanics",
    subPages: [
      { title: "Workshop", id: "mech-workshop" },
      { title: "Popup Window", id: "mech-popup" },
    ],
  },
  /*
  {
    id: "paging",
    title: "Paged & Dynamic Tables",
    subPages: [{ title: "Dynamic", id: "paging-dynamic" }],
  },
  {
    id: "data-ext",
    title: "Data extraction options",
    subPages: [
      { title: "Extracting Links/URLs", id: "data-links" },
      { title: "Images", id: "data-images" },
      { title: "Numbers & Money", id: "data-numbers-money" },
    ],
  },
  */
];

const revMap = {};
tutorialEntries.forEach((entry) => {
  revMap[entry.id] = entry;
  (entry.subPages ?? []).forEach((subPage) => (revMap[subPage.id] = subPage));
});

class TutorialTile extends Tile {
  constructor(state, onAdvance) {
    super();
    this.onAdvance_ = onAdvance;
    this.tutorialIndex_ = null;
    this.subContentIndex_ = null;
    this.skipped_ = false;
    this.completed_ = false;
    this.bindFromState_(state);
  }

  getData() {
    return {
      tutorialCompleted: this.completed_,
      tutorialSkipped: this.skipped_,
      triangles: false,
      pageTitle: "Tutorial",
    };
  }

  getType() {
    return SlideTypes.TABLE_TUTORIAL;
  }

  bindFromState_(state) {
    this.skipped_ = state.tutorialSkipped || false;
    this.completed_ = state.tutorialCompleted || false;
  }

  display(state) {
    this.bindFromState_(state);
    this.bindPageToTileState_(state);

    const slideType = this.getType();
    const existingSlide = document.querySelector(`.${slideType}`);
    if (existingSlide) {
      existingSlide.classList.remove("not-shown");
      existingSlide.classList.add("shown");
      return;
    }

    const slide = document.createElement("div");
    slide.className = `slide sidebar-slide ${slideType}`;
    slide.innerHTML = `
      <div class="sidebar-wrapper">
        <div class="fixed-nav"></div>
        <div class="tutorial-actions">
          <a>Skip</a>
        </div>
      </div>
      <div class="main-slide-content">
      </div>
    `;

    const nav = slide.querySelector(".sidebar-wrapper .fixed-nav");
    tutorialEntries.forEach((entry) => {
      const { title, subPages, id } = entry;
      const ul = document.createElement("ul");
      ul.innerHTML = `<li class=""><a class="main-nav-heading">${title}</a>${
        !!subPages ? "<ul></ul>" : ""
      }</li>`;
      ul.querySelector("a").classList.add(id);
      ul.querySelector("a").addEventListener("click", () => {
        this.setIndexesFromId_(id);
        this.renderTutorialContent_(id);
      });
      if (subPages) {
        const subList = ul.querySelector("ul");
        subPages.forEach(({ title, id }) => {
          const li = document.createElement("li");
          li.classList.add(id);
          li.innerHTML = `<a>${title}</a>`;
          li.addEventListener("click", () => {
            this.setIndexesFromId_(id);
            this.renderTutorialContent_(id);
          });
          subList.appendChild(li);
        });
      }
      nav.appendChild(ul);
    });

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
      if (state && state.subSectionId) {
        this.renderTutorialContent_(state.subSectionId);
      } else {
        this.advanceWithinTutorial_();
      }
    }, 250);

    slide.querySelector(".tutorial-actions a").addEventListener("click", () => {
      this.skipped_ = true;
      this.completed_ = false;
      this.onAdvance_();
    });
  }

  renderTutorialContent_(id) {
    const el = document.querySelector(`#${id}`);
    const mainContent = document.querySelector(".main-slide-content");
    Array.from(mainContent.children).forEach((child) =>
      child.classList.add("hidden")
    );

    Array.from(document.querySelectorAll(".active-tutorial")).forEach((el) =>
      el.classList.remove("active-tutorial")
    );
    document.querySelector(`.${id}`).classList.add("active-tutorial");

    Array.from(el.querySelectorAll(".placeholder")).forEach((placeholder) => {
      const type = placeholder.getAttribute("data-attr-table");
      this.renderTableInPlaceholder(placeholder, type);
    });

    Array.from(el.querySelectorAll(".placeholder-controls")).forEach(
      (controlsPlaceholder) => {
        this.renderControlsInElement_(controlsPlaceholder);
      }
    );

    el.classList.remove("hidden");
    el.parentElement.removeChild(el);
    mainContent.appendChild(el);

    this.addToHash_({ slideType: this.getType(), subSectionId: id });
  }

  renderControlsInElement_(el) {
    el.innerHTML = "";

    const button = document.createElement("button");
    button.innerText = "Next";
    button.className = "btn btn-lg btn-primary";
    button.addEventListener("click", this.advanceWithinTutorial_.bind(this));
    el.appendChild(button);
  }

  renderTableInPlaceholder(placeholder, tableType) {
    if (tableType === "basic") {
      exRenderBasicTable(placeholder);
    } else if (tableType === "basic-b") {
      exRenderBasicBTable(placeholder);
    } else if (tableType === "numbers") {
      exRenderNumbersTable(placeholder);
    } else if (tableType === "links") {
      exRenderLinksTable(placeholder);
    } else if (tableType === "dynamic-realtime") {
      exRenderDynamicRealtimeTable(placeholder);
    } else {
      return null;
    }

    const tag = document.createElement("div");
    tag.className = "example-table-tag";
    tag.innerText = "Example Table";
    placeholder.appendChild(tag);

    placeholder.classList.remove("placeholder");
    placeholder.classList.add("example-table-wrapper");
  }

  setIndexesFromId_(id) {
    tutorialEntries.forEach((entry, index) => {
      if (entry.id === id) {
        this.tutorialIndex_ = index;
        this.subContentIndex_ = null;
      }
      (entry.subPages ?? []).forEach((subPage, subIndex) => {
        if (subPage.id === id) {
          this.tutorialIndex_ = index;
          this.subContentIndex_ = subIndex;
        }
      });
    });
  }

  advanceWithinTutorial_() {
    if (this.tutorialIndex_ !== null) {
      if (!tutorialEntries[this.tutorialIndex_].subPages) {
        this.tutorialIndex_++;
      } else if (this.subContentIndex_ === null) {
        this.subContentIndex_ = 0;
      } else if (
        this.subContentIndex_ >=
        tutorialEntries[this.tutorialIndex_].subPages.length - 1
      ) {
        this.tutorialIndex_++;
        this.subContentIndex_ = null;
      } else {
        this.subContentIndex_++;
      }
    } else {
      this.tutorialIndex_ = 0;
      this.subContentIndex_ = null;
    }

    if (this.tutorialIndex_ >= tutorialEntries.length) {
      this.completed_ = true;
      this.onAdvance_();
    } else {
      const activeId =
        this.subContentIndex_ === null
          ? tutorialEntries[this.tutorialIndex_].id
          : tutorialEntries[this.tutorialIndex_].subPages[this.subContentIndex_]
              .id;
      this.renderTutorialContent_(activeId);
    }
  }
}
