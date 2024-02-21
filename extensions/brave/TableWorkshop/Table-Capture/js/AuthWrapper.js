class AuthWrapper {
  constructor() {
    this.googleAuthToken_ = null;
    this.googleAuthRefreshToken_ = null;

    this.hasIdentityPerms_ = false;
  }

  requestPerms() {
    if (this.hasIdentityPerms_) {
      return Promise.resolve(true);
    }
    return new Promise((resolve, reject) => {
      chrome.permissions.request(
        {
          permissions: ["identity"],
        },
        (granted) => {
          if (chrome.runtime.lastError) {
            return reject(chrome.runtime.lastError);
          }
          if (granted) {
            this.hasIdentityPerms_ = true;
            resolve(true);
          } else {
            reject(new Error("Chrome Identity permissions not granted."));
          }
        }
      );
    });
  }

  getGoogleToken() {
    if (!this.hasIdentityPerms_) {
      return this.requestPerms().then(() => this.getGoogleToken());
    }

    // NOTE(gmike): Figure out refresh token stuff:
    // https://www.youtube.com/watch?v=NxHVnK00Q6k

    return new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          return reject(chrome.runtime.lastError);
        }

        if (token) {
          this.googleAuthToken_ = token;
          resolve({ token });
        } else {
          reject(new Error("Unable to retrieve auth token."));
        }
      });
    });
  }
}
