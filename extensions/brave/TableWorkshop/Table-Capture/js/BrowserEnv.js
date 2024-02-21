class BrowserEnv {
  constructor() {
    // No-op.
  }

  getBackgroundPageP() {
    if (typeof chrome.extension.getBackgroundPage === "function") {
      return Promise.resolve(chrome.extension.getBackgroundPage());
    }
    return Promise.reject(
      new Error(
        "Table Capture is having trouble operating; you may be in private browsing mode."
      )
    );
  }

  isPageOnboardingPage(url) {
    // Edge:
    // return (
    //   url &&
    //   url.startsWith("extension://") &&
    //   url.includes("onboard/onboard.html")
    // );

    // Chrome:
    return (
      url &&
      url.startsWith("chrome-extension://") &&
      url.includes("onboard/onboard.html")
    );
  }

  isXmlDocument() {
    // Chrome, Edge:
    try {
      // https://stackoverflow.com/questions/16729263/get-xml-document-in-chrome-via-js
      return !!document.getElementById("webkit-xml-viewer-source-xml");
    } catch (e) {}
    return false;
  }

  createTab(params) {
    // Moz:
    // return browser.tabs.create(params);

    // Chrome, Edge:
    return new Promise((resolve) => {
      chrome.tabs.create(params, resolve);
    });
  }

  hasRuntimeError() {
    return !!chrome.runtime.lastError;
  }

  getRuntimeError() {
    return chrome.runtime.lastError;
  }

  checkLogLastError(message = "") {
    if (this.hasRuntimeError()) {
      console.log(message, chrome.runtime.lastError.message);
    }
  }

  checkThrowLastError() {
    if (this.hasRuntimeError()) {
      throw chrome.runtime.lastError;
    }
  }

  getWorlds(worldKeys, defaultVals) {
    const bigSyncStorage = new BigSyncStorage(this);
    return bigSyncStorage.getWorlds(defaultVals, worldKeys);
  }

  setWorld(worldKey, values) {
    const bigSyncStorage = new BigSyncStorage(this);
    return bigSyncStorage.setWorld(worldKey, values);
  }

  deleteWorld(key) {
    const bigSyncStorage = new BigSyncStorage(this);
    return bigSyncStorage.deleteWorld(key);
  }

  addStorageChangeListener(cb) {
    // Chrome, Edge:
    chrome.storage.onChanged.addListener(cb);
  }

  getSyncStorageApi() {
    // Moz:
    // return new MozStorageWrapper(browser.storage.sync);

    // Chrome, Edge:
    return new ChromeSyncStorageWrapper();
  }

  getLocalStorageApi() {
    // Moz:
    // return new MozStorageWrapper(browser.storage.local);

    // Chrome, Edge:
    return new ChromeLocalStorageWrapper();
  }

  sendMessage(params) {
    // Moz:
    // return browser.runtime
    //     .sendMessage(params)
    //     .then(response => {
    //       if (response && response.err) {
    //         throw response.err;
    //       }
    //       return Promise.resolve(response);
    //     });

    // Chrome, Edge:
    return new Promise((resolve, reject) => {
      chrome.extension.sendRequest(params, (response) => {
        if (response && response.err) {
          return reject(response.err);
        }
        return resolve(response);
      });
    });
  }

  getCookie(key) {
    // Moz:
    // return Promise.resolve(window.localStorage.getItem(key));

    // Chrome, Edge:
    return Promise.resolve(Cookies.get(key));
  }

  setCookie(key, value, expires = true) {
    // Moz:
    // window.localStorage.setItem(key, value);
    // return Promise.resolve();

    // Chrome, Edge:
    const path = chrome.extension.getURL("/");
    const options = { path };
    if (expires) {
      options.expires = 2;
    }
    Cookies.set(key, value, options);
    return Promise.resolve();
  }

  removeCookie(key) {
    // Moz:
    // window.localStorage.removeItem(key);
    // return Promise.resolve();

    // Chrome, Edge:
    Cookies.remove(key);
    return Promise.resolve();
  }
}

////

class StorageWrapper {
  set() {
    throw new Error("StorageWrapper -> set not supported");
  }

  get() {
    throw new Error("StorageWrapper -> get not supported");
  }

  remove() {
    throw new Error("StorageWrapper -> remove not supported");
  }

  getMaxItems() {
    return chrome.storage.sync.MAX_ITEMS;
  }

  getItemByteQuota() {
    return chrome.storage.sync.QUOTA_BYTES_PER_ITEM;
  }
}

class MozStorageWrapper extends StorageWrapper {
  constructor(api) {
    super();
    this.api_ = api;
  }

  removeP(key) {
    return this.api_.remove(key);
  }

  setP(values) {
    return this.api_.set(values);
  }

  getP(keyOrObj) {
    return this.api_.get(keyOrObj);
  }
}

class ChromeStorageWrapper extends StorageWrapper {
  constructor(api) {
    super();
    this.api_ = api;
  }

  removeP(key) {
    return new Promise((resolve) => {
      this.api_.remove(key, resolve);
    });
  }

  setP(values) {
    return new Promise((resolve, reject) => {
      this.api_.set(values, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }

  getP(keyOrObj) {
    return new Promise((resolve) => {
      this.api_.get(keyOrObj, resolve);
    });
  }
}

class ChromeSyncStorageWrapper extends ChromeStorageWrapper {
  constructor() {
    super(chrome.storage.sync);
  }
}

class ChromeLocalStorageWrapper extends ChromeStorageWrapper {
  constructor() {
    super(chrome.storage.local);
  }
}
