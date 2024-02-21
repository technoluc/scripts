class DynamicPagingListener extends PagingListener {
  constructor(userConfig) {
    super(userConfig);

    this.pagingRetryTimeout_ = null;
    this.likelyPagerErrorTimeout_ = null;
    this.onNextButtonFoundAction_ = null;
    this.nextButtonListener_.addNextButtonFoundHandler((nextButton) => {
      this.recordPagingElement_(nextButton);
      if (this.onNextButtonFoundAction_) {
        this.onNextButtonFoundAction_();
        this.onNextButtonFoundAction_ = null;
      }
    });
  }

  recordPagingElement_(pagingElement, userPagingElementSelector = null) {
    super.recordPagingElement_(pagingElement, userPagingElementSelector);
    // We begin auto-paging as soon as we have the next-page button.
    this.autoPagingOn_ = true;
  }

  beginListeningForAdvance() {
    this.nextButtonListener_.beginListeningForAdvance();
  }

  turnAutoPagingOff() {
    this.autoPagingOn_ = false;
    this.userProvidedPagingElementSelector_ = null;
    this.nextButtonListener_.destroy();

    this.clearAdvanceTimeout_();

    if (this.pagingRetryTimeout_) {
      window.clearTimeout(this.pagingRetryTimeout_);
      this.pagingRetryTimeout_ = null;
    }
  }

  isPagingElementDisabled_() {
    if (!this.pagingElement_) {
      return false;
    }
    if (_tcTagNameCompare(this.pagingElement_, "button")) {
      return this.pagingElement_.disabled;
    }
    if (_tcTagNameCompare(this.pagingElement_, "input")) {
      return (
        this.pagingElement_.type === "button" && this.pagingElement_.disabled
      );
    }
    return false;
  }

  advanceAfterTimeout({ delta, count }) {
    this.clearAdvanceTimeout_();

    // This happens slower than the auto-paging so that if we actually
    // do auto-page, it'll clear.
    if (delta !== 0) {
      if (this.likelyPagerErrorTimeout_) {
        window.clearTimeout(this.likelyPagerErrorTimeout_);
        this.likelyPagerErrorTimeout_ = null;
      } else {
        if (delta === count || 2 * delta === count) {
          this.likelyPagerErrorTimeout_ = window.setTimeout(() => {
            if (this.onAutoPagingWarning_) {
              this.onAutoPagingWarning_(
                new Error(
                  chrome.i18n.getMessage("errorNextPageButtonLikelyNotFound")
                ),
                "LIKELY_PAGER_ERROR"
              );
            }
          }, this.pagingWaitDuration_ * 2);
        }
      }
    }

    const advanceWaitDuration = this.pagingWaitDuration_;
    this.handleCountdown_(advanceWaitDuration, "ADVANCE");
    this.advanceTimeout_ = window.setTimeout(() => {
      this.advanceTimeout_ = null;

      if (this.autoPagingOn_) {
        this.advance_();
      } else {
        this.onNextButtonFoundAction_ = this.advance.bind(this);
      }
    }, advanceWaitDuration);
  }

  advance_() {
    this.nextButtonListener_.stopListening();

    try {
      if (this.userProvidedPagingElementSelector_) {
        return this.retryAutoPaging_(0);
      }

      if (this.pagingElement_ && !this.pagingElement_.isConnected) {
        this.maybeUpdatePagingElement_();
      }

      if (!this.pagingElement_) {
        // No-op.
        return;
      }

      // Warn if disconnected.
      if (!this.pagingElement_.isConnected) {
        const err = new Error(
          chrome.i18n.getMessage("errorUsingNextPageButtonSelector")
        );
        this.onAutoPagingWarning_ &&
          this.onAutoPagingWarning_(err, "DISCONNECTED");
      }

      if (this.isPagingElementDisabled_()) {
        // TODO(gmike): Notify user that paging is disabled / done.
      }

      _tcDoClick(this.pagingElement_);
    } catch (err) {
      // No-op.
    }
  }

  retryAutoPaging_(retryCount) {
    if (this.pagingRetryTimeout_) {
      window.clearTimeout(this.pagingRetryTimeout_);
      this.pagingRetryTimeout_ = null;
    }

    if (retryCount < this.maxPagingRetries_) {
      // Exponential back-off.
      const timeoutDuration =
        Math.pow(2, retryCount) * this.pagingRetryWaitDuration_;

      this.handleCountdown_(timeoutDuration, "ADVANCE_RETRY");
      this.pagingRetryTimeout_ = window.setTimeout(() => {
        this.pagingRetryTimeout_ = null;
        this.tryToUseSelector_(this.userProvidedPagingElementSelector_).catch(
          (_err) => {
            // Ignore the error, we'll try again.
            this.retryAutoPaging_(retryCount + 1);
          }
        );
      }, timeoutDuration);
    }
  }
}
