class AdRenderer {
  constructor() {
    this.browserEnv_ = new BrowserEnv();
  }

  getAd() {
    const rand = Math.random();
    if (rand < 0.3) {
      return this.getAdA();
    } else if (rand < 0.6) {
      return this.getPollAd();
    }
    return this.getAdC();
  }

  getPollAd() {
    return this.getAdTreatment({
      url: _TCAP_CONFIG.surveyUrl,
      legend: `We're dying for feedback`,
      body: "Tell us what you want us to add to the extension; drive Table Capture improvements!",
    });
  }

  getAdA() {
    return this.getAdTreatment({
      url: "https://presentio.us/?ref=cap-chrome-a2n",
      legend: "Other apps from George:",
      lead: "Try Presentious",
      body: "Narrate PowerPoints in your browser",
    });
  }

  getAdC() {
    return this.getAdTreatment({
      url: "https://presentio.us/?ref=cap-chrome-cc",
      legend: "Other apps from George:",
      body: "Teachers - Flip your classroom with Presentious!",
    });
  }

  getAdTreatment(config) {
    const wrapper = newElement("div", {
      className: "_tc_footer_ad",
    });

    const legend = newElement("h3", {
      text: config.legend,
    });

    if (config.lead) {
      const adTagline = newElement("span", { text: `: ${config.body}` });
      const adLink = newElement("a", {
        href: config.url,
        text: config.lead,
        click: () => {
          this.browserEnv_.createTab({ url: config.url });
          return false;
        },
      });

      wrapper.appendChild(legend);
      wrapper.appendChild(adLink);
      wrapper.appendChild(adTagline);
    } else {
      const adLink = newElement("a", {
        href: config.url,
        text: config.body,
        click: () => {
          this.browserEnv_.createTab({ url: config.url });
          return false;
        },
      });

      wrapper.appendChild(legend);
      wrapper.appendChild(adLink);
    }

    return wrapper;
  }
}
