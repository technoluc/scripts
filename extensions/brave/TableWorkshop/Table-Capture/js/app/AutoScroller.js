class AutoScroller {
  constructor() {
    this.scrollInterval_ = null;
    this.intervalDuration_ = _TCAP_CONFIG.autoScrollInterval;
    this.intervalCount_ = 0;
  }

  isScrolling() {
    return !!this.scrollInterval_;
  }

  setElement(el) {
    this.scrollingElement_ = el;
  }

  setElementIfNotSet(el) {
    if (!this.scrollingElement_) {
      this.setElement(el);
    }
  }

  startScrolling() {
    // We use this to determine if auto-scrolling is effective.
    let hasScrolled = false;

    this.scrollInterval_ = window.setInterval(() => {
      const scrollingElement = _tcGetScrollingElement(
        this.scrollingElement_,
        8
      );
      if (scrollingElement) {
        const { scrollTop, scrollLeft } = scrollingElement;
        const { height } = scrollingElement.getBoundingClientRect();
        scrollingElement.scroll(scrollLeft, scrollTop + height * 1.25);

        if (hasScrolled && scrollTop === 0) {
          try {
            // Slow this down - this will scroll to the bottom of the page, not incrementally like above.
            if (Math.random() > 0.5) {
              window.scrollTo(0, document.body.scrollHeight);
            }
          } catch (err) {}
        }
        hasScrolled = true;
      } else if (this.scrollingElement_) {
        _tcPerformScroll(
          this.scrollingElement_,
          Math.min(this.scrollingElement_.offsetHeight, 500)
        );
      } else {
        if (
          !hasScrolled &&
          this.intervalCount_ > _TCAP_CONFIG.numPagingRetries
        ) {
          // TODO(gmike): Surface the fact that scrolling failed.
        }
      }

      this.intervalCount_++;
    }, this.intervalDuration_);
  }

  stopScrolling() {
    this.scrollingElement_ = null;
    if (this.scrollInterval_) {
      window.clearInterval(this.scrollInterval_);
      this.scrollInterval_ = null;
    }
    this.intervalCount_ = 0;
  }
}
