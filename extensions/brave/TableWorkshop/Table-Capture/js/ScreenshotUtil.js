const ScreenshotUtil = {
  html2canvas: (domElement) => {
    try {
      if (typeof html2canvas === "undefined") {
        const params = { action: MessageAction.SCREENSHOT_VISIBLE_TAB };
        return new BrowserEnv()
          .sendMessage(params)
          .then(({ dataUrl }) =>
            ScreenshotUtil.cropImageForElement(dataUrl, domElement)
          );
      } else {
        return html2canvas(domElement).then((canvas) => {
          const data = canvas.toDataURL();
          if (ScreenshotUtil.isCanvasDataNull(data)) {
            throw new Error("Unable to get canvas data");
          }
          return data;
        });
      }
    } catch (err) {
      return Promise.reject(err);
    }
  },

  isCanvasDataNull: function (data) {
    return !data || !data.trim() || data.trim() == "data:,";
  },

  removeBase64Prefix: function (base64String) {
    const prefix = "base64,";
    const index = base64String.indexOf(prefix);
    if (index === -1) {
      return base64String;
    }
    return base64String.substring(index + prefix.length);
  },

  base64ToUint8Array: function (base64) {
    base64 = this.removeBase64Prefix(base64);

    const raw = atob(base64); // This is a native function that decodes a base64-encoded string.
    let uint8Array = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) {
      uint8Array[i] = raw.charCodeAt(i);
    }
    return uint8Array;
  },

  forceDownloadBlob: function (filename, blob) {
    const url = (window.URL || window.webkitURL).createObjectURL(blob);

    const link = window.document.createElement("a");
    link.style = "display: none";
    document.body.appendChild(link);
    link.href = url;
    link.download = filename;

    try {
      link.click();
    } catch (err) {
      const click = document.createEvent("Event");
      click.initEvent("click", true, true);
      link.dispatchEvent(click);
    }

    window.URL.revokeObjectURL(url);
  },
};
