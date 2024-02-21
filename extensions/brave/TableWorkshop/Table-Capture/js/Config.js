const DEV_PRETEND_PRO = false;
const DEV_PRETEND_CLOUD = false;
const DEV_DEBUG = false;
const DEV_ENTROPY = false;
const DEV_PRETEND_CHINA = false;

const EXT_PLATFORM = "C";
const EXT_ID = "iebpjdmgckacbodjpijphcplhebcmeop";
const EXT_SLUG = "table-capture";
const LOG_KEY = "tcapLog";
const BASE_API_URL = "https://georgemike.com/api";

// VERSIONING AND RELEASES
const VERSION_NUMBER = 44;
const VERSION_TEXT = `v10.0.${VERSION_NUMBER}${EXT_PLATFORM}`;
const RELEASE_NAME = "Oladipo";

////

const _TCAP_CLOUD_CONFIG_KEYS = ["gptApiKey", "gptTokensConsumed"];
const _TCAP_DURATION_DEFAULT_KEYS = [
  "autoScrollInterval",
  "sheetSyncWriteInterval",
  "autoPageWait",
];
const _TCAP_DURATION_DEFAULT_VALUES = {
  autoScrollInterval: 0.75 * 1000,
  sheetSyncWriteInterval: 10 * 1000,
  autoPageWait: 3 * 1000,
};

const _TCAP_EXTRACT_CONFIG_KEYS = [
  "addNewLinesForParagraphs",
  "csvDelimiter",
  "deleteEmptyRows",
  "extractImageSrc",
  "getLinkUrls",
  "inlineImagesGSheets",
  "ignoreHiddenPageElements",
  "ignoreHiddenTables",
  "ignoreImages",
  "moneyAsNumber",
  "numberAsNumber",
  "numDecimalChar",
  "numThousandChar",
  "removeStrikethroughs",
];

const _TCAP_CLOUD_CONFIG_DEFAULTS = {
  gptTokensConsumed: 0,
  gptApiKey: null,
};

const _TCAP_CONFIG_KEYS = [
  ..._TCAP_EXTRACT_CONFIG_KEYS,
  ..._TCAP_CLOUD_CONFIG_KEYS,
  ..._TCAP_DURATION_DEFAULT_KEYS,
  "alwaysAllowColumnify",
  "copyImagesToClipboard",
  "enableGDriveWrite",
  "enablePastePrompt",
  "enableRequestSearch",
  "enableUrlAutoPage",
  "filenameTemplate",
  "renderRowPreview",
  "showDeveloperOptions",
  "singleSheetExcelExport",
  "useUnifiedPaging",
  // Payments and licensing
  "onboarded",
  "installDate",
  "licenseCode",
  "paidPro",
  "paidCloud",
  "cloudLicenseCode",
  "requiresPaid",
  "googleAuthToken",
  "googleAuthRefreshToken",
  "user",
  // Recipes
  "recipes",
];

const _TCAP_CONFIG_DEFAULTS = {
  addNewLinesForParagraphs: false,
  alwaysAllowColumnify: false,
  copyImagesToClipboard: false,
  csvDelimiter: ",",
  deleteEmptyRows: true,
  enableGDriveWrite: false,
  enablePastePrompt: true,
  enableRequestSearch: false,
  enableUrlAutoPage: false,
  extractImageSrc: false,
  filenameTemplate: "",
  getLinkUrls: false,
  ignoreHiddenPageElements: true,
  ignoreHiddenTables: true,
  ignoreImages: false,
  inlineImagesGSheets: false,
  moneyAsNumber: false,
  numberAsNumber: false,
  numDecimalChar: ".",
  numThousandChar: ",",
  removeStrikethroughs: false,
  renderRowPreview: true,
  showDeveloperOptions: false,
  singleSheetExcelExport: false,
  useUnifiedPaging: false,
  // Payments and licensing
  onboarded: false,
  installDate: null,
  licenseCode: null,
  paidPro: 0,
  paidCloud: 0,
  cloudLicenseCode: null,
  requiresPaid: false,
  user: {},
  googleAuthToken: null,
  googleAuthRefreshToken: null,
  // Recipes
  recipes: [],
  //
  ..._TCAP_CLOUD_CONFIG_DEFAULTS,
  ..._TCAP_DURATION_DEFAULT_VALUES,
};

const _TCAP_CONFIG = {
  releaseName: RELEASE_NAME,
  versionText: VERSION_TEXT,
  devPretendPro: DEV_PRETEND_PRO,
  devPretendCloud: DEV_PRETEND_CLOUD,
  devPretendChina: DEV_PRETEND_CHINA,
  devDebug: DEV_DEBUG,
  devEntropy: DEV_DEBUG && DEV_ENTROPY,

  cookie: {
    tabId: "tableCaptureTab",
    install: "tableCaptureInstallTime",
    o365: "tableCaptureO365",
  },

  selectionEventKey: "sel-event",
  selectionAttemptKey: "sel-attempt",

  logKey: LOG_KEY,
  extBase: `chrome-extension://${EXT_ID}`,
  chromeExtBase: "chrome-extension://",

  // API
  api: {
    publishTable: `${BASE_API_URL}/table`,
    cloudSignup: `${BASE_API_URL}/licensing/charge/cloudsignup`,
    auth: `${BASE_API_URL}/licensing/charge/user/auth`,
    cloudLicenses: `${BASE_API_URL}/licensing/charge/user/cloudlicenses`,
    ping: `${BASE_API_URL}/licensing/charge/ping`,
  },

  // LICENSING & PAYMENTS
  paidOnly: false,
  cloudLicenseProducts: ["tablecapturecloud"],
  licenseProduct: "tablecapture",
  adjacentProducts: [
    "edgecapture",
    "foxcapture",
    // NOTE(gmike): This is the license product.
    "tablecapture",
    "tablecapturepro",
    "tablecapturelife",
    "tablecapturecloud",
    "tabletoexcel",
  ],
  cloudLicensePurchaseUrl: "https://georgemike.com/tablecapture/cloud/",
  cloudAccountUrl: "https://georgemike.com/tablecapture/cloud/account/",
  cloudMagicColumnsUrl:
    "https://georgemike.com/tablecapture/cloud/magiccolumns/",
  licensePurchaseUrlBase: "https://georgemike.com/licensing?app=",
  licensePurchaseUrl:
    "https://georgemike.com/licensing?app=dGFibGVjYXB0dXJlcHJv",
  licensePurchaseUrlStripe: "https://buy.stripe.com/dR629jgmm1FbgEgdQQ",
  licensePurchaseUrlStripeChina: "https://buy.stripe.com/dR65lv0no97Dds428h",
  licenseUrl: `${BASE_API_URL}/licensing/charge`,
  manageLicenseUrl: "https://georgemike.com/licensing/manage?key=",
  managePurchaseUrl: "https://georgemike.com/licensing/purchase?key=",

  // Links
  discordInvite: "https://discord.gg/JWzDVSNBgC",
  reviewLink: `https://chrome.google.com/webstore/detail/${EXT_SLUG}/${EXT_ID}/reviews`,
  supportMailTo: `mailto:support@georgemike.com?subject=Table%20Capture`,
  newsletterUrl: "http://eepurl.com/dmo_QT",
  newSheetsUrl: "http://spreadsheets.google.com/ccc?new=true",
  surveyUrl: "https://goo.gl/forms/0F5PHkDHut8ZYCmo1",
  roadmapUrl:
    "https://docs.google.com/document/d/10wM8tSyatRIlKGM7bYYBHLbfCZANuO5ewoX2SnC8HMs/edit",
  recipesDocUrl:
    "https://docs.google.com/document/d/1bxJNXozYSA_zld8QVA92QhSP5wUA5BMOC5A5h8HZm5o/edit",
  office365Link: "https://www.office.com/launch/excel?auth=2",
  airtableExtension:
    "https://chrome.google.com/webstore/detail/airtable-extractor-by-tab/jdldgiafancpgcleiodepocjobmmfjif",
  powerBiExtension:
    "https://chrome.google.com/webstore/detail/powerbi-extractor-by-tabl/lkojnilkkidnhhdlpkocjfpgfkhholan",

  // Referral links:
  zillowExtension:
    "https://zillowdataexporter.com/?ref=tcap&source=TableCapture",

  reportPageUrl: "https://georgemike.com/tables/report?d=$DATA",
  reportErrorUrl: "https://georgemike.com/tables/report?err=$ERROR",

  batchWait: 0.5 * 1000,
  selectionDataMaxCols: 4,
  selectionDataMaxRows: 3,
  minValidNumCells: 3,
  autoScrollInterval: _TCAP_DURATION_DEFAULT_VALUES.autoScrollInterval,
  autoPageWait: _TCAP_DURATION_DEFAULT_VALUES.autoPageWait,
  pagingRetryDelay: 1.5 * 1000,
  numPagingRetries: 4,

  rowIdAttr: "_tc-row-id",

  // CA$H
  maxPagingFreeDate: 20210227,

  //// CLOUD

  supportsCloud: true,
  sheetSyncWriteInterval: _TCAP_DURATION_DEFAULT_VALUES.sheetSyncWriteInterval,
  gptMockResponses: false,

  //// WATCHERS

  supportsWatchers: false,
};

const _TCAP_COPY_CONST = {
  rowSeparator: "\r\n",
  colSeparator: "\t",
};

const _TC_AD_NETWORK_HOSTNAME = ["googleads.g.doubleclick.net"];
const _TC_AD_NETWORK_PARTIALS = [".doubleclick.net", ".googlesyndication.com"];

// NOTE(gmike): These are reflected in the manifest.
const _TC_OAUTH_IDS = {
  // Note: This is using this Extension ID: hdipbhfjpefabfogglieieacgbekefin
  dev: "1097367017052-trrb99o67tl9v060qcul5k2848da97t6.apps.googleusercontent.com",
  dev_b:
    "1097367017052-v4ahk3t966vu0n8tcitbji622tp1q5ga.apps.googleusercontent.com",
  devRedirectUri: "chrome-extension://hdipbhfjpefabfogglieieacgbekefin",
  // See here: https://console.cloud.google.com/apis/credentials?project=georgemike
  prod: "134705207172-cjqlrudj323jpldsf98sjmfaf2045b05.apps.googleusercontent.com",
};
const _TC_ACTIVE_OAUTH_CONFIG = {
  clientId: _TC_OAUTH_IDS.dev,
  redirectUri: _TC_OAUTH_IDS.devRedirectUri,
  scopes: [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/userinfo.email",
  ],
};

//// Google Cloud API Keys
// These should probably be cycled every few months.
const _TC_GSHEETS_API_KEY_PROD = "AIzaSyBy8JE30kVReC4DIMyZela8qUpTnSxIz8E";
const _TC_GSHEETS_API_KEY_DEV = "AIzaSyDTF0mqZwnIK9-3wbx4mvA3swly91x95v4";
const _TC_GSHEETS_API_KEY = _TC_GSHEETS_API_KEY_PROD;
