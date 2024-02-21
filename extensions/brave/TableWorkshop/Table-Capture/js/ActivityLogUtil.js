function getExtensionActivityLogData(browserEnv) {
  const key = _TCAP_CONFIG.logKey;
  return browserEnv
    .getLocalStorageApi()
    .getP(key)
    .then((values) => {
      if (values && values[key]) {
        return formatActivityLogData(values[key]);
      }
      return null;
    });
}

function formatActivityLogData(logData) {
  Object.values(logData)
    .filter((entry) => entry && typeof entry === "object")
    .forEach((logItem) => {
      Object.values(logItem.elements).forEach((element) => {
        if (!element.name) {
          if (element.id) {
            element.name = `Table#${element.id}`;
          } else if (element.pathTo) {
            element.name = `Table (${element.pathTo})`;
          } else {
            element.name = "Table";
          }
        }
      });
    });

  return logData;
}

function getReadableOutputFormat(outputFormat) {
  if (outputFormat === OutputFormat.CLIPBOARD_DOCUMENT) {
    return "DOCUMENT";
  }
  return outputFormat;
}

function getReadableMessageAction(messageAction) {
  if (!messageAction) {
    return null;
  }
  if (
    messageAction == MessageAction.COPY_TABLE_STRING ||
    messageAction == MessageAction.COPY_TABLES_BATCH ||
    messageAction == MessageAction.COPY_STRING
  ) {
    return "COPY";
  }
  if (
    messageAction == MessageAction.COPY_TABLE_IMAGE ||
    messageAction.includes("SCREENSHOT")
  ) {
    return "SCREENSHOT";
  }
  if (messageAction.includes("EXCEL")) {
    return "EXCEL";
  }
  if (messageAction.includes("CSV")) {
    return "CSV";
  }
  if (messageAction === MessageAction.AI_COLUMN_EXTRACTION) {
    return "MAGIC COLUMNS";
  }
  return messageAction;
}

function summarizeLatestRepro(repros) {
  if (!repros || repros.length === 0) {
    return null;
  }

  const latestRepro = repros[repros.length - 1];
  return summarizeRepro(latestRepro);
}

function summarizeRepro({ messageAction, outputFormat }) {
  const readableMessageAction = getReadableMessageAction(messageAction);

  if (messageAction && messageAction == outputFormat) {
    return `EXPORT → ${readableMessageAction}`;
  }

  if (messageAction && outputFormat) {
    const readableOutputFormat = getReadableOutputFormat(outputFormat);
    return `${readableMessageAction} → ${readableOutputFormat}`;
  }

  if (messageAction) {
    return readableMessageAction;
  }

  return "EXPORT";
}
