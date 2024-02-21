
const WORKER_SRC = '/js/lib/pdfjs-2.14.305-dist/build/pdf.worker.js';
const PAGE_SCALE = 1;

//// Example URLS:
// https://www.w3.org/WAI/WCAG21/working-examples/pdf-table/table.pdf
// https://sedl.org/afterschool/toolkits/science/pdf/ast_sci_data_tables_sample.pdf

class PdfLoader {
  constructor(userConfig, canvas) {
    this.userConfig_ = userConfig;
    this.canvas_ = canvas;

    this.errorHandlers_ = [];
    this.pdf_ = null;
    this.pages_ = [];
    this.password_ = "";
  }

  setPassword(password) {
    this.password_ = password;
  }

  getPages() {
    return this.pages_;
  }

  getPageCount() {
    return this.pdf_.numPages;
  }

  addErrorHandler(handler) {
    this.errorHandlers_.push(handler);
  }

  async isTextContentAvailable(pageNum) {
    const page = this.pages_[pageNum - 1];
    const textContent = await page.getTextContent();
    return textContent && textContent.items && textContent.items.length;
  }

  async searchText(pageNum, text) {
    const page = this.pages_[pageNum - 1];
    const textContent = await page.getTextContent();
    if (!textContent || !textContent.items || !textContent.items.length) {
      throw new Error("No text content found in PDF - this could mean the PDF is a scanned image.");
    }
    return textContent.items.filter(el => el.str.startsWith(text));
  }

  renderPdfForPage_(pageNumber) {
    return this.pdf_
        .getPage(pageNumber)
        .then(page => {
          const viewport = page.getViewport({scale: PAGE_SCALE});

          const canvasContext = this.canvas_.getContext('2d');
          this.canvas_.height = viewport.height;
          this.canvas_.width = viewport.width;
          this.canvas_.classList.remove('hidden');

          // NOTE(gmike): This ruins reusabilty, but whatever.
          document.querySelector('.page-actions').classList.remove('hidden');

          const renderContext = {
            canvasContext,
            viewport,
          };
          const renderTask = page.render(renderContext);
          return new Promise((resolve, reject) => {
            renderTask.promise.then(async () => {
              this.pages_.push(page);
              resolve();
            });
          })
        });
  }
}

class PdfUrlLoader extends PdfLoader {
  constructor(userConfig, url, canvas) {
    super(userConfig, canvas);
    this.url_ = url;
  }

  renderPdf(pageNumber) {
    return new Promise((resolve, reject) => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        const loadingTask = pdfjsLib.getDocument({
          url: this.url_,
          password: this.password_,
        });
        loadingTask.promise.then(pdf => {
          this.pdf_ = pdf;
          this.renderPdfForPage_(pageNumber)
              .then(resolve)
              .catch(reject);
        }, reason => {
          reject(reason);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
}

class PdfFileLoader extends PdfLoader {
  constructor(userConfig, file, canvas) {
    super(userConfig, canvas)
    this.file_ = file;
  }

  renderPdf(pageNumber) {
    return new Promise((resolve, reject) => {
      try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

        readFile(this.file_)
            .then(fileData => {
              const uint8Array = base64ToUint8Array(fileData.data);
              if (!uint8Array) {
                return Promise.reject(new Error('The selected file is empty or unreadable.'));
              }

              const loadingTask = pdfjsLib.getDocument({
                data: uint8Array,
                password: this.password_,
              });
              return new Promise((resolve, reject) => {
                loadingTask.promise.then(resolve).catch(reject);
              });
            })
            .then(pdf => {
              this.pdf_ = pdf;
              return this.renderPdfForPage_(pageNumber);
            })
            .then(resolve)
            .catch(reject);
      } catch (err) {
        reject(err);
      }
    });
  }
}

////

function readFile(fileHandle) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    let file = fileHandle;
    reader.onload = function(e) {
      const fileData = {
        name : escape(file.name),
        data : e.target.result
      };
      resolve(fileData);
    };

    // Read in the image file as a data URL.
    reader.readAsDataURL(fileHandle);
  });
}

function removeBase64Prefix(base64String) {
  if (!base64String || base64String === 'data:') {
    return '';
  }

  const prefix = 'base64,';
  const index = base64String.indexOf(prefix);
  if (index === -1) {
    return base64String;
  }
  return base64String.substring(index + prefix.length);
}

function base64ToUint8Array(base64) {
  base64 = this.removeBase64Prefix(base64);
  if (!base64) {
    return null;
  }

  var raw = atob(base64); // This is a native function that decodes a base64-encoded string.
  var uint8Array = new Uint8Array(new ArrayBuffer(raw.length));
  for (var i = 0; i < raw.length; i++) {
    uint8Array[i] = raw.charCodeAt(i);
  }
  return uint8Array;
}
