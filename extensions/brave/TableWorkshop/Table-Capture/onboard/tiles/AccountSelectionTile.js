function getPlanText(plan) {
  if (plan === "free") {
    return {
      short: "Free",
      long: "...",
    };
  }
  if (plan === "pro") {
    return {
      short: "Table Capture Pro",
      long: "",
    };
  }
  if (plan === "cloud") {
    return {
      short: "Table Capture Cloud",
      long: "",
    };
  }
  return { short: "", long: "" };
}

class AccountSelectionTile extends Tile {
  constructor(state, onAdvance, onProLicenseActivation) {
    super();

    this.onAdvance_ = onAdvance;
    this.onProLicenseActivation_ = onProLicenseActivation;
    this.completed_ = false;
    this.plan_ = null;

    this.bindFromState_(state);
  }

  bindFromState_(state) {
    this.completed_ = state.accountSelectionCompleted || false;
    this.plan_ = state.plan;
  }

  getData() {
    return {
      accountSelectionCompleted: this.completed_,
      plan: this.plan_,
      prettyPlan: getPlanText(this.plan_),
      triangles: true,
      pageTitle: "Plan Selection",
    };
  }

  getType() {
    return SlideTypes.ACCOUNT_SELECTION;
  }

  onPlanSelected_(plan) {
    this.completed_ = true;
    this.plan_ = plan;
    this.onAdvance_();
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

    const freeFeatures = `
      <div class="plan-feature enabled">Copy tables to the clipboard</div>
      <div class="plan-feature enabled">Export to Google Sheets</div>
      <div class="plan-feature enabled">Export hard-to-capture &lt;div&gt; tables</div>
      <div class="plan-feature enabled">Batch &lt;table&gt; exports</div>
      <div class="plan-feature enabled">Data export customization</div>
    `;

    const proFeatures = `
      <div class="plan-feature enabled">Capture multi-page and dynamic tables with automatic paging and scrolling</div>
      <div class="plan-feature enabled">Export tables from PDFs</div>
      <div class="plan-feature enabled">Screenshot tables</div>
      <div class="plan-feature enabled">Export tables as Markdown text</div>
      <div class="plan-feature enabled">Priority support (email &amp; screenshare)</div>
    `;

    const cloudFeatures = `
      <div class="plan-feature enabled">
        Live sync of dynamic data between any table and Google Sheets.
        <a class="demo-link" href="https://www.youtube.com/watch?v=BkRb_7BiKGQ" target="_blank">See how it works.</a>
      </div>
      <div class="plan-feature enabled">
        Magic Columns: AI-enhanced data parsing and extraction.
        <a class="demo-link" href="https://www.youtube.com/watch?v=rDDVbxl8GyM" target="_blank">See it in action.</a>
      </div>
    `;

    const slide = document.createElement("div");
    slide.className = `scroll-slide ${slideType}`;
    slide.innerHTML = `
      <div class="container">
        <div class="big-text">Plan Selection</div>
        <div class="sub-text">Choose a Table Capture plan that's right for you.</div>
        <div class="faq-link"><a>Learn more</a> about how they work.</a></div>
        <div class="row">
          <div class="plans-wrapper">
            <div class="plan col-lg-4">
              <div class="inner">
                <div class="plan-header">
                  <div class="plan-name">Free</div>
                  <div class="plan-price">$0</div>
                </div>
                <div class="plan-body">
                  <div class="plan-description"></div>
                  <div class="plan-features">
                    ${freeFeatures}
                  </div>
                </div>
                <div class="plan-footer">
                  <button class="btn btn-default btn-lg" data-attr-plan="free">Select</button>
                </div>
              </div>
            </div>
            <div class="plan col-lg-4 pro-plan">
              <div class="inner">
                <div class="plan-header">
                  <div class="plan-name">Pro</div>
                  <div class="plan-price">$1/month</div>
                </div>
                <div class="plan-body">
                  <div class="plan-description"></div>
                  <div class="plan-features">
                    ${freeFeatures}
                    <hr />
                    ${proFeatures}
                  </div>
                </div>
                <div class="plan-footer">
                  <button class="btn btn-default btn-lg" data-attr-plan="pro">Select</button>
                  <div class="footer-footer">
                    <span class="plan-trial-info">14-day Free Trial&nbsp;&nbsp;&middot;&nbsp;&nbsp;</span>
                    Billed Annually
                  </div>
                </div>
              </div>
            </div>
            <div class="plan col-lg-4 cloud-plan">
              <div class="inner">
                <div class="plan-header">
                  <div class="plan-name">Cloud</div>
                  <div class="plan-price">$25/month</div>
                </div>
                <div class="plan-body">
                  <div class="plan-description"></div>
                  <div class="plan-features">
                    ${freeFeatures}
                    <hr />
                    ${proFeatures}
                    <hr />
                    ${cloudFeatures}
                  </div>
                </div>
                <div class="plan-footer">
                  <button class="btn btn-default btn-lg" data-attr-plan="cloud">Select</button>
                  <div class="footer-footer">7-day Free Trial&nbsp;&nbsp;&middot;&nbsp;&nbsp;Billed Monthly</div>
                </div>
              </div>
            </div>
          </div>
          <div class="faq">
            <div class="heading">Common Questions</div>
            <div class="question">
              <div class="question-text">I already have a license. How do I use it?</div>
              <div class="answer-text existing-license">
                That's great. Your Table Capture license is valid for up to two of your personal devices.
                <div>
                  <input type="button" value="Add an existing license" class="btn btn-default" />
                </div>
              </div>
            </div>
            <div class="question">
              <div class="question-text">Can I cancel anytime?</div>
              <div class="answer-text">
                Yes. You can cancel your subscription from the license page at anytime, which will ensure you are not charged again.
                If you cancel, you can still access your subscription for the full time period you paid for.
              </div>
            </div>
            <div class="question">
              <div class="question-text">Will you send an annual renewal reminder?</div>
              <div class="answer-text">Yes, we will email you a reminder 7 days before the annual renewal.</div>
            </div>
            <div class="question">
              <div class="question-text">Can I get an invoice for work?</div>
              <div class="answer-text">Yes, we'll automatically send a link to an invoice you can use to be reimbursed.</div>
            </div>
            <div class="question">
              <div class="question-text">Do you offer refunds?</div>
              <div class="answer-text">Yes. You can email us within 15 days of any payment and we will issue you a full refund.</div>
            </div>
            <div class="question">
              <div class="question-text">What if I have more questions?</div>
              <div class="answer-text">Send George an email anytime: g@georgemike.com</div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (!_TCAP_CONFIG.supportsCloud) {
      slide.querySelector(".cloud-plan button").innerText = "Not Available";
    }

    if (isUserInChina()) {
      slide
        .querySelector(".pro-plan .footer-footer .plan-trial-info")
        .classList.add("hidden");
    }

    slide.querySelector(".faq-link a").addEventListener("click", () => {
      document.querySelector(".faq").scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "start",
      });
    });

    slide
      .querySelector(".existing-license input")
      .addEventListener("click", () => {
        this.onProLicenseActivation_();
      });

    this.slideStack_.appendChild(slide);
    window.setTimeout(() => {
      slide.classList.add("shown");
    }, 250);

    Array.from(document.querySelectorAll(".plan-footer button")).forEach(
      (button) => {
        button.addEventListener("click", () => {
          const plan = button.getAttribute("data-attr-plan");
          this.onPlanSelected_(plan);
        });
      }
    );
  }
}
