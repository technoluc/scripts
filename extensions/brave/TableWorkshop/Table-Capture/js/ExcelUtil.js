
function _tcIsStringNumeric(str, extraChars=[]) {
  if (str === null || str === undefined || typeof str !== "string") {
    return false;
  }
  extraChars.forEach(c => {
    str = str.replace(new RegExp("\\" + c, "g"), "");
  });
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function _tcStringToNumber(str, numDecimalChar, numThousandChar) {
  const originalStr = str;
  try {
    str = str.replace(new RegExp("\\" + numThousandChar, "g"), "");
    str = str.replace(new RegExp("\\" + numDecimalChar, "g"), ".");
    return parseFloat(str);
  } catch (err) {}
  return originalStr;
}

function _tcInPlaceNumberization(data, numDecimalChar, numThousandChar) {
  data.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (_tcIsStringNumeric(cell, [numDecimalChar, numThousandChar])) {
        data[i][j] = _tcStringToNumber(cell, numDecimalChar, numThousandChar);
      }
    });
  });
}

////

var ExcelUtil = {
  s2ab: function(s) {
    if(typeof ArrayBuffer !== 'undefined') {
      var buf = new ArrayBuffer(s.length);
      var view = new Uint8Array(buf);
      for (var i=0; i!=s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    } else {
      var buf = new Array(s.length);
      for (var i=0; i!=s.length; ++i) buf[i] = s.charCodeAt(i) & 0xFF;
      return buf;
    }
  },

  writeWorkbookToCsv: function(wb, filename, delimiter) {
    filename = (filename || 'table-capture') + '.csv';
    delimiter = delimiter || ',';

    let wbout;
    try {
      wbout = XLSX.write(wb, {
        bookType: 'csv',
        bookSST: true,
        type: 'binary',
        FS: delimiter,
      });
    } catch (err) {
      console.log(err);
      if (delimiter !== ',') {
        throw `Error using custom delimiter (${delimiter})`;
      }
      throw `Error exporting table: ${filename}`;
    }

    try {
      saveAs(new Blob([ExcelUtil.s2ab(wbout)], {type: "text/csv"}), filename);
    } catch (e) {
      console.log(e, wbout);
      throw `Error exporting table: ${filename}`;
    }
    return wbout;
  },

  exportArrayOfArraysToCSVP: function(data, sheetname, filename, delimiter) {
    return new Promise((resolve, reject) => {
      try {
        resolve(ExcelUtil.exportArrayOfArraysToCSV(data, sheetname, filename, delimiter));
      } catch (err) {
        reject(err);
      }
    });
  },

  exportArrayOfArraysToCSV: function(data, sheetname, filename, delimiter) {
    sheetname = sheetname || 'Table Capture';
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();      
    XLSX.utils.book_append_sheet(wb, sheet, sheetname);
    return ExcelUtil.writeWorkbookToCsv(wb, filename, delimiter);
  },

  writeWorkbookToExcel: function(wb, filename) {
    const type = "xlsx";
    filename = filename || 'table-capture';
    filename += '.' + type;

    const wbout = XLSX.write(wb, {bookType: type, bookSST: true, type: 'binary'});
    try {
      const excelFileBlob = new Blob([ExcelUtil.s2ab(wbout)], {type: "application/vnd.ms-excel"});
      saveAs(excelFileBlob, filename);
    } catch(e) {
      console.log(e, wbout);
      throw `Error exporting table: ${filename}`;
    }
    return wbout;
  },

  exportArrayOfArraysToExcelP: function(data, sheetname, filename, opts={}) {
    return new Promise((resolve, reject) => {
      try {
        resolve(ExcelUtil.exportArrayOfArraysToExcel(data, sheetname, filename, opts));
      } catch (err) {
        reject(err);
      }
    });
  },

  exportArrayOfArraysToExcel: function(data, sheetname, filename, opts={}) {
    const {
      numberAsNumber = false,
      numDecimalChar = ".",
      numThousandChar = ",",
    } = opts;

    if (numberAsNumber) {
      _tcInPlaceNumberization(data, numDecimalChar, numThousandChar);
    }

    sheetname = sheetname || 'Table Capture';
    const sheet = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, sheetname);
    return ExcelUtil.writeWorkbookToExcel(wb, filename);
  },

  multiSheetExport: (datasets, filename, opts={}) => {
    const {
      numberAsNumber = false,
      numDecimalChar = ".",
      numThousandChar = ",",
    } = opts;

    try {
      const wb = XLSX.utils.book_new();
      datasets.forEach((data, i) => {
        if (numberAsNumber) {
          _tcInPlaceNumberization(data, numDecimalChar, numThousandChar);
        }

        const sheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, sheet, `TC-Sheet-${i + 1}`);
      });
      return Promise.resolve(ExcelUtil.writeWorkbookToExcel(wb, filename));
    } catch (err) {
      return Promise.reject(err);
    }
  },

  idToName: function(name, template) {
    if (!name && !template) {
      return '';
    }

    const cleanIsh = (s) => {
      s = s.replace(/\s+/g, '_');
      s = s.replace(/\(/g, '');
      s = s.replace(/\)/g, '');
      return s;
    }

    if (!name) {
      name = "";
    }

    // Clean the name
    name = cleanIsh(name);

    if (!template) {
      return name;
    }

    let domain = window.location.host;
    if (domain.indexOf('.') !== -1) {
      const domainParts = domain.split('.');
      if (domainParts.length > 1) {
        domain = domainParts[domainParts.length - 2];
      }
    }

    // NOTE(gmike): These can't have overlapping prefixes.
    const varToVal = {
      '$NAME' : name,
      '$DOMAIN' : domain,
      '$DATE' : _tcGetNowDateKey(),
      '$ISO_DATETIME' : new Date().toISOString(),
    }

    let filename = template;
    Object
      .keys(varToVal)
      .forEach(key => {
        if (filename.indexOf(key) !== -1) {
          filename = filename.replace(key, varToVal[key]);
        }
      });

    return cleanIsh(filename);
  }
};
