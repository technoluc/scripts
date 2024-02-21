/**
  TYPES:

    type TCPublicTable {
      title?: string;
      pageTitle?: string;
      sourceUrl?: string;
      pages?: number;
      paged?: boolean;
      dynamic?: boolean;
      pagingDef?: TCPagingDef
    }

    type TCAction {
      messageAction: MessageAction;
      outputFormat?: OutputFormat;
    }

    type TCRepro {
      messageAction: MessageAction;
      outputFormat?: OutputFormat;
      url: string;
      index?: number;
      pathTo?: string;
      pages?: number;
      paged?: boolean;
      pagingDef?: TCPagingDef
    }

    type TCTableDef {
      id?: string;
      name?: string;
      index?: number;
      pathTo?: string;
    }

    type TCPagingDef {
      pathToElement: string;
      pathToPager?: string | string[];
      treatAsTable: boolean;
    }
*/

class TableActionLogger {
  constructor(userConfig) {
    this.userConfig_ = userConfig;
    this.extractConfig_ = userConfigToExtractConfig(userConfig);
    this.browserEnv_ = new BrowserEnv();
    this.localStorageApi_ = this.browserEnv_.getLocalStorageApi();
  }

  initLogDataForUrl_(logData, url, title) {
    if (!logData.version) {
      logData.version = "5.2";
    }

    if (!logData[url]) {
      logData[url] = {
        url,
        title,
        actionCount: 0,
        elements: {},
      };
    }
  }

  logGptTokensUsed(tokenCounts) {
    const keyName = "gptTokensConsumed";
    return this.localStorageApi_.getP(keyName).then((values) => {
      let sum = values[keyName] || 0;
      tokenCounts.forEach((count) => (sum += count));
      return this.localStorageApi_.setP({ [keyName]: sum });
    });
  }

  logPublishableTableAction(publishableTable, tcAction) {
    if (publishableTable.paged) {
      return this.logPagedTableAction_(publishableTable, tcAction);
    }

    if (publishableTable.dynamic) {
      return this.logDynamicTableAction_(publishableTable, tcAction);
    }

    const {
      sourceUrl: url,
      pageTitle,
      tableDef,
      treatAsTable,
    } = publishableTable;
    return this.getLogDataForPage_(url, pageTitle)
      .then((logData) => {
        const { pathTo } = tableDef;
        const key = `dom://${pathTo}`;
        const name = this.getTableName_(pageTitle, tableDef);

        if (!logData[url].elements[key]) {
          logData[url].elements[key] = {
            key,
            name,
            paged: false,
            dynamic: false,
            actionCount: 0,
            repros: [],
          };
        }

        logData[url].actionCount++;
        logData[url].elements[key].actionCount++;
        logData[url].elements[key].repros.push({
          ...tcAction,
          url,
          pathTo,
          treatAsTable,
          extractConfig: this.extractConfig_,
          timestamp: Date.now(),
        });

        return this.localStorageApi_.setP({ [_TCAP_CONFIG.logKey]: logData });
      })
      .catch((err) => this.handleError_(err));
  }

  logPagedTableAction_(publishableTable, tcAction) {
    const { sourceUrl: url, pageTitle } = publishableTable;
    return this.getLogDataForPage_(url, pageTitle)
      .then((logData) => {
        const pagingDef = publishableTable.pagingDef;
        const key = `dom://${pagingDef.pathToElement}`;

        if (!logData[url].elements[key]) {
          logData[url].elements[key] = {
            key,
            name: `Multi-page Table (Pages: ${publishableTable.pages})`,
            paged: true,
            dynamic: false,
            actionCount: 0,
            repros: [],
          };
        }

        logData[url].actionCount++;
        logData[url].elements[key].actionCount++;
        logData[url].elements[key].repros.push({
          ...tcAction,
          url,
          pagingDef,
          paged: true,
          pages: publishableTable.pages,
          extractConfig: this.extractConfig_,
          timestamp: Date.now(),
        });

        return this.localStorageApi_.setP({ [_TCAP_CONFIG.logKey]: logData });
      })
      .catch((err) => this.handleError_(err));
  }

  logDynamicTableAction_(publishableTable, tcAction) {
    const { sourceUrl: url, pageTitle } = publishableTable;
    return this.getLogDataForPage_(url, pageTitle)
      .then((logData) => {
        // TODO(gmike): Implement this.
        return this.localStorageApi_.setP({ [_TCAP_CONFIG.logKey]: logData });
      })
      .catch((err) => this.handleError_(err));
  }

  logWrapperAction(tableWrapper, tcAction) {
    // NOTE(gmike): Direct TableWrapper Access.
    const { url, pageTitle, def } = tableWrapper;
    return this.logActionForTableWrapperDefs_(
      tcAction,
      url,
      pageTitle,
      [def],
      tableWrapper.getReproOptions()
    );
  }

  logWrapperDefAction(tableWrapperDefs, tcAction, url, pageTitle) {
    return this.logActionForTableWrapperDefs_(
      tcAction,
      url,
      pageTitle,
      tableWrapperDefs
    );
  }

  logActionForTableWrapperDefs_(tcAction, url, title, defs, reproOptions) {
    if (!url) {
      return Promise.reject("No URL present.");
    }

    const tcTableDefs = defs.map((def) => {
      const { index, table, pathTo } = def;
      if (table) {
        const { id, adjusted: name } = table;
        return { id, index, pathTo, name };
      } else if (pathTo) {
        const { id, name } = def;
        return { id, index, pathTo, name };
      }

      throw new Error("TableActionLogger::error - fallthrough");
    });
    return this.logActionForTCTableDefs_(
      tcAction,
      url,
      title,
      tcTableDefs,
      reproOptions
    );
  }

  logActionForTCTableDefs_(tcAction, url, title, tcTableDefs, reproOptions) {
    return this.getLogDataForPage_(url, title)
      .then((logData) => {
        tcTableDefs.forEach((tcTableDef) => {
          const { id, name, index, pathTo } = tcTableDef;

          // NOTE(gmike): Previously we would also use a `table-${index}` key scheme.
          const key = `dom://${pathTo}`;

          // If the name or ID changes, we clobber
          if (
            !logData[url].elements[key] ||
            // Name is weird because it gets reformatted.
            (name && logData[url].elements[key].name != name) ||
            logData[url].elements[key].id != id
          ) {
            logData[url].elements[key] = {
              key,
              actionCount: 0,
              repros: [],
              id,
              pathTo,
              index,
              name,
              paged: false,
              dynamic: false,
            };
          }

          logData[url].actionCount++;
          logData[url].elements[key].actionCount++;
          logData[url].elements[key].repros.push({
            ...tcAction,
            ...reproOptions,
            url,
            pathTo,
            index,
            extractConfig: this.extractConfig_,
            timestamp: Date.now(),
          });
        });

        return this.localStorageApi_.setP({ [_TCAP_CONFIG.logKey]: logData });
      })
      .catch((err) => this.handleError_(err));
  }

  getTableName_(pageTitle, tableDef) {
    if (tableDef.table && tableDef.table.adjusted) {
      return tableDef.table.adjusted;
    }
    if (tableDef.id) {
      return `Table (#${tableDef.id})`;
    }
    if (tableDef.rows) {
      return `Table (rows: ${tableDef.rows})`;
    }
    if (pageTitle) {
      return `Table (${pageTitle})`;
    }
    return "Table (N/A)";
  }

  getLogDataForUrlAndDef(url, tableDef) {
    if (!tableDef) {
      return Promise.resolve(null);
    }

    return this.getLogDataForUrl(url).then((logData) => {
      const { pathTo } = tableDef;
      const key = `dom://${pathTo}`;
      if (logData.elements) {
        return logData.elements[key];
      }
    });
  }

  getLogDataForUrl(url) {
    return this.localStorageApi_.getP(_TCAP_CONFIG.logKey).then((values) => {
      const logData = values[_TCAP_CONFIG.logKey] || {};
      return logData[url];
    });
  }

  getLogDataForPage_(url, title) {
    return this.localStorageApi_.getP(_TCAP_CONFIG.logKey).then((values) => {
      const logData = values[_TCAP_CONFIG.logKey] || {};
      this.initLogDataForUrl_(logData, url, title);
      return logData;
    });
  }

  handleError_(err) {
    // No-op. Swallow.
    console.error(err);
  }
}

////

const _tcLogWorkshopAction = (tcAction, userConfig, publishableTable) => {
  const actionLogger = new TableActionLogger(userConfig);
  actionLogger.logPublishableTableAction(publishableTable, tcAction);
};

const _tcLogTableWrapperMessageAction = (
  tableWrapper,
  messageAction,
  outputFormat = null,
  userConfig = null
) => {
  const actionLogger = new TableActionLogger(userConfig);
  actionLogger.logWrapperAction(tableWrapper, {
    messageAction,
    outputFormat,
  });
};

const _tcLogRequestAction = (request, userConfig) => {
  if (!request.logInfo || !request.logInfo.tableWrapperDefs) {
    return;
  }

  const {
    url,
    action: messageAction,
    outputFormat,
    pageTitle,
    tableWrapperDefs,
  } = request.logInfo;

  const action = { messageAction, outputFormat };
  const actionLogger = new TableActionLogger(userConfig);
  actionLogger.logWrapperDefAction(tableWrapperDefs, action, url, pageTitle);
};
