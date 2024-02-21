class OnboardManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.activeTileState_ = null;

    this.path_ = [];
    this.pathByType_ = {};

    this.hashChangeManager_ = new HashChangeManager();
    this.hashChangeManager_.setChangeHandler(this.getStateAndRun_.bind(this));
  }

  getStateFromHash_() {
    if (this.hashChangeManager_.hasHash()) {
      return this.hashChangeManager_.getHashState();
    }

    // NOTE(gmike): You can override this to iterate on a specific tile.
    return { slideType: SlideTypes.WELCOME };
  }

  initialize() {
    const hashState = this.getStateFromHash_();

    this.path_ = [
      new WelcomeTile(
        this.goToSlideType_.bind(this, SlideTypes.NEW_VS_RETURNING)
      ),
      new TableCaptureExperienceTile(
        hashState,
        this.goToSlideType_.bind(this, SlideTypes.USER_TYPE)
      ),
      new UserTypeTile(
        hashState,
        this.goToSlideType_.bind(this, SlideTypes.TABLE_TUTORIAL)
      ),
      new TutorialTile(
        hashState,
        this.goToSlideType_.bind(this, SlideTypes.ACCOUNT_SELECTION)
      ),
      new AccountSelectionTile(
        hashState,
        this.goToSlideType_.bind(this, SlideTypes.SUMMARY),
        this.goToSlideType_.bind(this, SlideTypes.ACTIVATE_LICENSE)
      ),
      new SummaryTile(
        this.goToSlideType_.bind(this, SlideTypes.ACTIVATE_LICENSE),
        this.goToSlideType_.bind(this, SlideTypes.ACTIVATE_CLOUD_LICENSE)
      ),
      new ActivateLicenseTile(
        hashState,
        this.userConfig_,
        this.goToSlideType_.bind(this, SlideTypes.SUMMARY)
      ),
      new ActivateCloudLicenseTile(
        hashState,
        this.userConfig_,
        this.goToSlideType_.bind(this, SlideTypes.SUMMARY)
      ),
    ];
    this.path_.forEach((tile, i) => {
      tile.setIndex(i);
      this.pathByType_[tile.getType()] = tile;
    });

    this.goTo_({
      ...this.getState_(),
      ...hashState,
    });

    progressJs().start();
    progressJs().set(0);
  }

  getStateAndRun_() {
    const hashState = this.getStateFromHash_();
    this.goTo_({
      ...this.getState_(),
      ...hashState,
    });
  }

  getState_() {
    let state = {};
    this.path_.forEach((tile) => {
      state = { ...state, ...tile.getData() };
    });
    return state;
  }

  goToSlideType_(slideType) {
    return this.goTo_({
      ...this.getState_(),
      slideType,
    });
  }

  hideLastTile_() {
    const lastTile =
      this.activeTileState_ &&
      this.pathByType_[this.activeTileState_.slideType];
    lastTile && lastTile.hide();
  }

  goTo_(state) {
    this.hideLastTile_();

    const tile = this.pathByType_[state.slideType];
    this.activeTileState_ = state;

    window.setTimeout(() => {
      tile.display(state);

      const progressVal = (tile.getIndex() / this.path_.length) * 100;
      progressJs().set(progressVal);
    }, 250);
  }
}
