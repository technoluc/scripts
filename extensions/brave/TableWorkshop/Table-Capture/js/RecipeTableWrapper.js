class RecipeTableWrapper extends SpecialCaseElementWrapper {
  constructor(recipe, element, url, pageTitle, windowName, userConfig) {
    super(element, url, pageTitle, windowName, userConfig);

    this.recipe_ = recipe;
    this.define_();
  }

  isRecipeWrapper() {
    return true;
  }

  hasNextPageSelector() {
    return !!this.recipe_.pagingSelector;
  }

  getNextPageSelector() {
    return this.recipe_.pagingSelector;
  }

  getRecipe() {
    return this.recipe_;
  }

  getTableId() {
    return this.recipe_.name;
  }

  isRecordable() {
    return (
      this.recipe_ &&
      this.recipe_.rpfn &&
      !this.recipe_.rpfn.trim().endsWith("return [];")
    );
  }

  isTableRecipe_() {
    const el = this.getDomElement();
    return _tcTagNameCompare(el, ["TABLE", "TBODY", "THEAD"]);
  }

  snoop() {
    const defaultTableRootValueProvider = (el) =>
      TableUtil.nodeToArrays(
        el,
        _TCAP_COPY_CONST.rowSeparator,
        _TCAP_COPY_CONST.colSeparator,
        this.userConfig_,
        true
      );
    const defaultTableRowValueProvider = (el) =>
      TableUtil.trNodeToRowArray(
        el,
        _TCAP_COPY_CONST.colSeparator,
        this.userConfig_
      );
    const defaultArbRootValueProvider = (el) =>
      TableUtil.getArbPreAlignmentForRoot(el, this.userConfig_);
    const defaultArbRowValueProvider = (el) =>
      TableUtil.getArbPreAlignmentForNode(el, this.userConfig_);

    let usingDefaults = true;
    let rootValueProvider = null;
    let rowValueProvider = null;
    try {
      const fn = eval(`(element, userConfig) => { ${this.recipe_.fn} }`);
      const rpfn = eval(`(element, userConfig) => { ${this.recipe_.rpfn} }`);
      rowValueProvider = (element) => rpfn(element, this.userConfig_);
      rootValueProvider = (element) => fn(element, this.userConfig_);
      usingDefaults = false;
    } catch (err) {
      throw err;
    }

    if (this.isTableRecipe_()) {
      rootValueProvider = rootValueProvider || defaultTableRootValueProvider;
      rowValueProvider = rowValueProvider || defaultTableRowValueProvider;
      this.snoop_ = new TableMutationSnoop(rootValueProvider, rowValueProvider);
    } else {
      rootValueProvider = rootValueProvider || defaultArbRootValueProvider;
      rowValueProvider = rowValueProvider || defaultArbRowValueProvider;
      this.snoop_ = new ArbMutationSnoop(rootValueProvider, rowValueProvider);
      if (usingDefaults) {
        this.snoop_.setValuesPostProcessor((valueArray) =>
          TableUtil.arbAlign(valueArray, false)
        );
      }
    }

    // We have the user-provided selector, so we can use it.
    this.snoop_.initializeForElement(
      this.getDomElement(),
      this.recipe_.selector
    );

    return this.snoop_;
  }

  isValid() {
    return true;
  }

  define_() {
    const { id, pathTo } = this.getDomAttributes_(this.domElement_);
    const alignedArray = this.getAsArrays();

    const rows = alignedArray;
    const nRows = rows.length;
    const nCols = rows && rows.length ? rows[0].length : 0;

    // Note: Trailing space is intended.
    const size = `(${nRows} x ${nCols}) `;

    this.def = {
      recipe: this.recipe_,
      pathTo,
      numCells: nRows * nCols,
      table: {
        id: size + id,
        adjusted: `${size} ${this.recipe_.name} (Recipe)`,
        rows: nRows,
        columns: nCols,
        windowName: this.windowName,
      },
    };
  }

  getAsArrays() {
    try {
      const fn = eval(
        `(element, userConfig, basePath) => { ${this.recipe_.fn} }`
      );
      const arrays = fn(
        this.domElement_,
        this.userConfig_,
        window.location.origin
      );

      const re_n = new RegExp("\\n", "g");
      const re_t = new RegExp("\\t", "g");
      return arrays.map((arr) => {
        return arr.map((val) => {
          if (val) {
            if (typeof val === "string") {
              val = val.replace(re_n, "");
              val = val.replace(re_t, "");
            } else {
              // NOTE(gmike, 6/7/2022): Some recipes were just returning number as values.
              val = val + "";
            }
            return val.trim();
          }
          return val;
        });
      });
    } catch (err) {
      // NOTE(gmike): This happens when the recipe is in a bad place. Nothing to do.
      console.log("RecipeTableWrapper::getAsArrays", err);
    }

    return [];
  }
}
