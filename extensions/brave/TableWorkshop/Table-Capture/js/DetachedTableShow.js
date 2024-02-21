
class DetachedTableShow {
  constructor(userConfig, manager, tabId) {
    this.userConfig_ = userConfig;
    this.manager_ = manager;
    this.tabId_ = tabId;
  }

  refresh() {
    this.manager_.destroy();
    this.manager_.findTables(this.userConfig_);
    setTimeout(this.display.bind(this), 500);
  }

  display() {
    if (this.userConfig_.requiresPaid && !this.userConfig_.paidPro) {
      return _tcPageToast('Please activate Table Capture first.', 'error');
    }

    const validTableWrappers = this
        .getTables_()
        .map(def => this.manager_.getTable(def.index))
        .filter(tableWrapper => !!tableWrapper && tableWrapper.supportsInlineMenu());
    if (validTableWrappers.length) {
      validTableWrappers.forEach(tableWrapper => this.displayInlineMenu_(tableWrapper));
    } else if (window === top) {
      try {
        return _tcPageToast("There are no table elements on this page. Right-click to launch the Table Capture Workshop to capture your data.", "error");
      } catch (err) {}
    }
  }

  getTables_() {
    try {
      return this.manager_.getAllTableDefs() || [];
    } catch(e) {}
    return [];
  }

  displayInlineMenu_(tableWrapper) {
    let actions = [
      {
        text : chrome.i18n.getMessage('copyClipboardAction'),
        className: 'action_copy clicky',
        cb: this.copyTable_.bind(this, tableWrapper, null, false),
      },
      {
        text : chrome.i18n.getMessage('googleDocAction'),
        className: 'action_goog clicky',
        cb: this.copyTable_.bind(this, tableWrapper, this.googDocCreate_.bind(this), true),
      },
    ];

    if (this.userConfig_.paidPro) {
      actions = [
        {
          text : chrome.i18n.getMessage('excelAction'),
          className: 'action_excel clicky',
          cb: this.excelTable_.bind(this, tableWrapper),
        },
        {
          text : chrome.i18n.getMessage('csvAction'),
          className: 'action_csv clicky',
          cb: this.csvTable_.bind(this, tableWrapper),
        },
        ...actions,
      ];
    }

    actions.push({
      text : chrome.i18n.getMessage('openWorkshopAction'),
      className: 'action_open_workshop clicky',
      cb: this.openWorkshopForElement_.bind(this, tableWrapper),
    });

    const menu = document.createElement('ul');
    menu.className = '_tc_inline_table_action_menu';

    actions.forEach(action => {
      menu.appendChild(newElement('li', {
        className: action.className,
        click : action.cb,
        html: action.text,
      }));
    });

    menu.appendChild(newElement('li', {
      className: '_tc_inline_status_message _tc_not_shown',
    }));

    menu.appendChild(newElement('li', {
      title : chrome.i18n.getMessage('removeInlineDescription'),
      className: 'action_remove',
      click : tableWrapper.removeInlineMenu.bind(tableWrapper),
      html: '&#215;',
    }));

    tableWrapper.flash();
    tableWrapper.attachInlineMenu(menu);
  }

  openWorkshopForElement_(tableWrapper) {
    handleInlineToWorkshopEvent({
      tabId: this.tabId_,
      userConfig: this.userConfig_,
      tableWrapper,
    });
  }

  csvTable_(tableWrapper) {
    tableWrapper
        .csv()
        .catch(err => alert(err));
  }

  excelTable_(tableWrapper) {
    tableWrapper
        .excel()
        .catch(err => alert(err));
  }

  copyTable_(tableWrapper, cb, isForGoog) {
    if (!isForGoog) {
      tableWrapper.flashInlineMessage(chrome.i18n.getMessage('copying'));
    }

    tableWrapper.copy();
    cb && cb();

    if (!isForGoog) {
      tableWrapper.flashInlineMessage(chrome.i18n.getMessage('copied'));
    }
  }

  googDocCreate_() {
    const params =  {
      url: _TCAP_CONFIG.newSheetsUrl,
      outputFormat: OutputFormat.GOOG,
      enablePastePrompt: this.userConfig_.enablePastePrompt,
    };
    new BrowserEnv()
        .sendMessage(params)
        .catch(err => alert(err));
  }
}
