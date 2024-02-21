
const Clipboard = {
  copyImage: data => {
    const blob = new Blob([ScreenshotUtil.base64ToUint8Array(data)], {type: 'image/png'});
    const item = new ClipboardItem({'image/png': blob});
    navigator.clipboard.write([item]);
  },

  copy : data => {
    if (data === null) {
      throw new Error('No data present');
    }

    function createTextArea (value) {
      var txt = newElement('textarea', {
        className : 'offscreeneded'
      });
      txt.value = value;

      document.body.appendChild(txt);
      return txt;
    }

    try {
      var txt = createTextArea(data);
      txt.select();

      document.execCommand('Copy');
      document.body.removeChild(txt);
    } catch (err) {
      console.log(`Error caught in Clipboard.js while copying`);
      throw err;
    }
  }
};
