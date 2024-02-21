function onGAPILoad() {
  gapi.client
    .init({
      apiKey: _TC_GSHEETS_API_KEY,
      discoveryDocs: [
        "https://sheets.googleapis.com/$discovery/rest?version=v4",
      ],
    })
    .then(
      function () {},
      function (error) {
        console.log("onGAPILoad::error", error);
      }
    );
}

function addGapiToPage() {
  const head = document.getElementsByTagName("head")[0];
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "https://apis.google.com/js/client.js?onload=onGAPILoad";
  head.appendChild(script);
}

addGapiToPage();

////

function buildGSheetUrl(id) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}

function getSheetRange(spreadsheetId, range) {
  return gapi.client.sheets.spreadsheets.values.get({ spreadsheetId, range });
}

function getSheetsInSpreadsheet(spreadsheetId) {
  return new Promise((resolve, reject) => {
    const req = gapi.client.sheets.spreadsheets.get({ spreadsheetId });
    req.then(
      (response) => resolve(response.result.sheets),
      (err) => {
        const message = err.result.error.message;
        reject(new Error(message));
      }
    );
  });
}

function createGSheet({ filename, sheetName }) {
  return new Promise((resolve, reject) => {
    gapi.client.sheets.spreadsheets
      .create({
        properties: { title: filename },
        sheets: [
          {
            properties: {
              sheetId: 0,
              index: 0,
              title: sheetName,
            },
          },
        ],
      })
      .then((response) => {
        const id = response.result.spreadsheetId;
        const url = buildGSheetUrl(id);
        return resolve({ id, url });
      })
      .catch(reject);
  });
}

async function checkForSheetExistence(spreadsheetId, sheetName) {
  const sheets = await getSheetsInSpreadsheet(spreadsheetId);
  const sheet = sheets.find((sheet) => sheet.properties.title === sheetName);
  return !!sheet;
}

async function batchSheetUpdate(spreadsheetId, resources) {
  return new Promise((resolve, reject) => {
    let resource = {
      requests: [],
    };
    resources.map((req) => resource.requests.push(req));
    const data = {
      spreadsheetId,
      resource,
    };
    const req = gapi.client.sheets.spreadsheets.batchUpdate(data);
    req.then((response) => resolve(response.result), reject);
  });
}

const createAddSheetReq = (sheetName) => {
  const resource = {
    addSheet: {
      properties: {
        title: sheetName,
      },
    },
  };
  return resource;
};

function addSheetToSpreadsheet(spreadsheetId, sheetName) {
  const sheetReq = createAddSheetReq(sheetName);
  return batchSheetUpdate(spreadsheetId, [sheetReq]);
}

function writeToSheetPlease(spreadsheetId, sheetName, values) {
  const params = {
    spreadsheetId,
    range: sheetName,
    valueInputOption: "USER_ENTERED",
  };
  const reqBody = {
    range: sheetName,
    majorDimension: "ROWS",
    values,
  };
  return new Promise(async (resolve, reject) => {
    try {
      const sheetExists = await checkForSheetExistence(
        spreadsheetId,
        sheetName
      );
      if (sheetExists) {
        // No op.
      } else {
        await addSheetToSpreadsheet(spreadsheetId, sheetName, values);
      }
    } catch (err) {
      const message = err.result.error.message;
      if (message.includes("already exists")) {
        // No op.
      } else {
        return reject(err);
      }
    }

    const req = gapi.client.sheets.spreadsheets.values.update(params, reqBody);
    req.then(
      (response) => resolve(response.result),
      (err) => {
        const message = err.result.error.message;
        reject(new Error(message));
      }
    );
  });
}

////

class SheetsSync {
  constructor() {
    this.sheetInstanceList_ = {};
    this.sheetList_ = {};
  }

  hasSheetForInstance(instanceId) {
    if (!instanceId) {
      return false;
    }
    return !!this.sheetInstanceList_[instanceId];
  }

  logSheetForInstance(instanceId, sheetData) {
    this.sheetInstanceList_[instanceId] = sheetData;
    this.sheetList_[sheetData.id] = sheetData;
  }

  getSheetForInstance(instanceId) {
    if (!instanceId) {
      return null;
    }
    return this.sheetInstanceList_[instanceId];
  }

  hasSheet(sheetId) {
    return !!this.sheetList_[sheetId];
  }

  getSheet(sheetId) {
    return this.sheetList_[sheetId];
  }

  logSheet(sheetData) {
    if (!sheetData) {
      return;
    }
    const id = sheetData.id;
    if (!id) {
      return;
    }

    // This ensures we're not clobbering an existing sheet.
    if (!this.sheetList_[id]) {
      this.sheetList_[id] = {};
    }

    this.sheetList_[id] = {
      ...sheetData,
      ...this.sheetList_[id],
    };
  }

  resetSheetList() {
    this.sheetList_ = {};
  }

  updateSheetListEntry(newSheet) {
    this.sheetList_[newSheet.id] = newSheet;
  }

  getSheetList() {
    return this.sheetList_;
  }

  setAccessToken_(accessToken) {
    gapi.auth.setToken({
      access_token: accessToken,
    });
    return Promise.resolve();
  }

  getSheetRowCount(accessToken, spreadsheetId, range) {
    return this.setAccessToken_(accessToken)
      .then(() => getSheetRange(spreadsheetId, range))
      .then((response) => response.result.values.length);
  }

  createSheet(accessToken, sheetOptions) {
    return this.setAccessToken_(accessToken).then(() =>
      createGSheet(sheetOptions)
    );
  }

  getSheetsInSpreadsheet(accessToken, spreadsheetId) {
    return this.setAccessToken_(accessToken).then(() =>
      getSheetsInSpreadsheet(spreadsheetId)
    );
  }

  writeToSheet(accessToken, sheetId, dataArray, sheetOptions) {
    let { sheetName } = sheetOptions;
    sheetName = sheetName || "Sheet1";
    return this.setAccessToken_(accessToken).then(() =>
      writeToSheetPlease(sheetId, sheetName, dataArray)
    );
  }
}
