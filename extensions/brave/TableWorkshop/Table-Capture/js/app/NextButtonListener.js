
class NextButtonListener {
  constructor() {
    this.listeningForClicks_ = false;

    this.clickedElements_ = [];
    this.clickedElementsTimeout_ = null;
    this.nextButtonEl_ = null;
    this.nextButtonFound_ = false;
    this.onNextButtonFoundHandler_ = null;
  }

  addNextButtonFoundHandler(onNextButtonFoundHandler) {
    this.onNextButtonFoundHandler_ = onNextButtonFoundHandler;
  }

  beginListeningForAdvance() {
    this.listeningForClicks_ = true;
    Array
        .from(document.querySelectorAll('*'))
        .forEach(el => this.waitForClick_(el));
  }

  isProcessingClicks() {
    return this.clickedElements_ && this.clickedElements_.length && !!this.clickedElementsTimeout_;
  }

  stopListening() {
    this.listeningForClicks_ = false;
  }

  destroy() {
    this.stopListening();

    if (this.clickedElementsTimeout_) {
      window.clearTimeout(this.clickedElementsTimeout_);
      this.clickedElementsTimeout_ = null;
    }

    this.clickedElements_ = [];
  }

  waitForClick_(el) {
    // TODO(gmike): We may want to save these for removal later.
    const fn = this.handleClick_.bind(this, el);
    el.addEventListener('mousedown', fn);
  }

  handleClick_(el, e) {
    if (this.listeningForClicks_) {
      if (isNodeWorkshopChild(el) || el.nodeName === 'HTML' || el.nodeName === 'BODY') {
        // No-op.
      } else {
        if (this.clickedElementsTimeout_) {
          window.clearTimeout(this.clickedElementsTimeout_);
        }
        this.clickedElements_.push(el);
        this.clickedElementsTimeout_ = window.setTimeout(this.handleClickedElements_.bind(this), 50);
      }
    }
    return true;
  }

  handleClickedElements_() {
    if (this.clickedElements_ && this.clickedElements_.length) {
      const el = this.clickedElements_.shift();
      this.nextButtonEl_ = el;
      this.nextButtonFound_ = true;
      this.onNextButtonFoundHandler_ && this.onNextButtonFoundHandler_(this.nextButtonEl_);
    }
    this.clickedElementsTimeout_ = null;
  }
}
