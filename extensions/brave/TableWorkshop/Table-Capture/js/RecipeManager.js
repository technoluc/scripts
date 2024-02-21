class RecipeManager {
  constructor(userConfig) {
    this.userConfig_ = userConfig;

    this.wrapper_ = document.querySelector("section.recipe-wrapper .recipes");
    this.recipesById_ = {};
    this.browserEnv_ = new BrowserEnv();

    this.importManager_ = new RecipeImporter(document.body);
  }

  initialize() {
    if (this.userConfig_.paidPro) {
      this.importManager_.addOnDropHandler((recipe) =>
        this.handleRecipeImport_(recipe)
      );
      this.importManager_.addOnErrorHandler(({ err, file }) =>
        this.handleError_(err)
      );

      document
        .querySelector(".btn-new-recipe")
        .addEventListener("click", this.handleNewRecipe_.bind(this));
      document
        .querySelector(".btn-clear-all")
        .addEventListener("click", this.handleDeleteAll_.bind(this));

      this.fetchRecipes_()
        .then((recipes) => this.renderRecipes_(recipes, true))
        .catch((err) => this.handleError_(err));
    } else {
      document.querySelector(".dropzone-mask").classList.add("hidden");
      document
        .querySelector(".btn-new-recipe")
        .setAttribute("disabled", "disabled");
      document
        .querySelector(".btn-clear-all")
        .setAttribute("disabled", "disabled");

      const message =
        _TCAP_CONFIG.paidOnly && this.userConfig_.requiresPaid
          ? `You currently have no recipes. <a class="alert-link" href="/activate.html">Activate Table Capture</a> to create some.`
          : `You currently have no recipes. <a class="alert-link" href="/upgrade.html">Upgrade to Pro</a> to create some.`;
      this.wrapper_.innerHTML = "";
      this.wrapper_.appendChild(createAlertPaneWithHTML(message, "warning"));
    }
  }

  setRecipes(recipes) {
    this.recipesById_ = {};
    recipes.forEach((r) => (this.recipesById_[r.id] = r));
  }

  isWithoutActiveRecipes() {
    const recipes = Object.values(this.recipesById_);
    return recipes.filter((r) => r.status === "active").length === 0;
  }

  handleDeleteAll_() {
    this.browserEnv_
      .deleteWorld("_recipe_world")
      .then(() => this.browserEnv_.getSyncStorageApi().removeP("recipes"))
      .then(() => this.renderRecipes_([]))
      .catch((err) => this.handleError_(err));
  }

  fetchRecipes_() {
    return this.browserEnv_
      .getWorlds(["_recipe_world"], { recipes: [] })
      .then((optionsValues) => {
        return Promise.resolve(
          optionsValues.recipes.filter((r) => r.status == "active")
        );
      });
  }

  handleNewRecipe_() {
    if (this.isWithoutActiveRecipes()) {
      this.wrapper_.innerHTML = "";
    }
    this.renderEditForm_({ id: Math.random().toString(36).slice(2) }, true);
  }

  handleRecipeImport_(recipe) {
    if (this.isWithoutActiveRecipes()) {
      this.wrapper_.innerHTML = "";
    }
    recipe.id = Math.random().toString(36).slice(2);
    this.renderEditForm_(recipe, true);
  }

  renderNoRecipes_() {
    this.wrapper_.innerHTML = "";
    this.wrapper_.appendChild(
      createAlertPane("You currently have no recipes", "success")
    );
  }

  isCreatingViaUrl_() {
    const params = getUrlParams();
    return params.action === "new";
  }

  renderRecipes_(recipes, checkForUrlParams = false) {
    this.setRecipes(recipes);

    const params = getUrlParams();
    const createFromUrl = checkForUrlParams && params.action === "new";
    if (this.isWithoutActiveRecipes() && !createFromUrl) {
      return this.renderNoRecipes_();
    }

    this.wrapper_.innerHTML = "";
    recipes.forEach((recipe) => this.renderEditForm_(recipe));

    if (createFromUrl) {
      try {
        const recipe = JSON.parse(atob(params.def));
        if (recipe.selector === "table") {
          recipe.fn = STOCK_TABLE_FN;
          recipe.rpfn = STOCK_TABLE_RPFN;
        }
        this.handleRecipeImport_(recipe);
      } catch (err) {
        return this.handleError_(err);
      }
    }
  }

  renderEditForm_(recipe, expand = false) {
    const timestamp = recipe.updated ? new Date(recipe.updated) : new Date();

    // NOTE(gmike): Deliberately fugly.
    const defaultBody = `
  const rows = [];
  // TODO(you): Figure out how to turn this element into an array of arrays.
  return rows;
`;
    const defaultRowProviderBody = `
  return [];
`;
    const defaultOnLoadFn = "";

    const form = document.createElement("form");
    form.className = `collapsed ${recipe.disabled && "form-disabled"}`;
    form.innerHTML = `
      <div class="collapsed-header">
        <div>
          <div class="ro-recipe-name">${recipe.name || "None"}</div>
          <div class="recipe-metadata">
            <span title="Updated">${timestamp.toLocaleDateString()}</span>
            <a class="clip-summary hidden" href="/clips.html?id=recipe-${
              recipe.id
            }"></a>
          </div>
        </div>
        <div>
          <input type="button"
              class="btn btn-default btn-edit"
              value="Edit" />
          <input type="button" class="btn btn-default btn-export" value="Export" />
          <input
              type="button"
              class="btn ${
                recipe.autoClip ? "btn-warning" : "btn-success"
              } btn-toggle-clipping"
              value="${
                recipe.autoClip ? "Stop Auto-Clipping" : "Start Auto-Clipping"
              }" />
          <input
              type="button"
              class="btn btn-default btn-toggle-status"
              value="${recipe.disabled ? "Enable" : "Disable"}" />
        </div>
      </div>
      <div class="form-group">
        <label for="recipe-name">Recipe name</label>
        <input
            type="text"
            class="form-control recipe-name"
            name="recipe-name"
            id="recipe-name"
            value="${recipe.name || ""}"
            placeholder="Name" />
      </div>
      <div class="form-group">
        <label for="recipe-desc">Description</label>
        <input
            type="text"
            class="form-control recipe-desc"
            name="recipe-desc"
            id="recipe-desc"
            value="${recipe.description || ""}"
            placeholder="Description" />
      </div>
      <div class="form-group">
        <label for="recipe-url-example">Recipe URL Example</label>
        <input
            type="text"
            class="form-control recipe-url-example"
            name="recipe-url-example"
            id="recipe-url-example"
            value="${recipe.urlExample || ""}"
            placeholder="An example url" />
      </div>
      <div class="form-group">
        <label for="recipe-url-regex">Recipe URL Regex</label>
        <input
            type="text"
            class="form-control recipe-url-regex"
            name="recipe-url-regex"
            id="recipe-url-regex"
            value="${recipe.urlRegex || ""}"
            placeholder="A regular expression to match the above URL" />
      </div>
      <div class="form-group">
        <label for="recipe-selector">Table element selector</label>
        <input
            type="text"
            class="form-control recipe-selector"
            name="recipe-selector"
            id="recipe-selector"
            value="${recipe.selector || ""}"
            placeholder="The DOM selector" />
      </div>
      <div class="form-group">
        <label for="recipe-selector">Next button selector</label>
        <input
            type="text"
            class="form-control recipe-paging-selector"
            name="recipe-paging-selector"
            id="recipe-paging-selector"
            value="${recipe.pagingSelector || ""}"
            placeholder="The DOM selector for the next page button" />
      </div>
      <div class="form-group">
        <label for="recipe-fn">Function: Element &rarr; Array of Arrays</label>
        <p class="context">
          This function will be called with the table element retrieved using the DOM selector above. Don't change the function signature.
        </p>
<pre contentEditable="true" class="recipe-fn" spellcheck="false">
function element2DataTable(element) {${recipe.fn || defaultBody}}
</pre>
      </div>
      <div class="form-group">
        <label for="recipe-rowprovider-fn">Function: Row Element &rarr; Array</label>
        <p class="context">
          This is function is completely optional. It'll be called with a table row when the table is a Dynamic Table. Don't change the function signature.
        </p>
<pre contentEditable="true" class="recipe-rowprovider-fn" spellcheck="false">
function element2RowArray(element) {${recipe.rpfn || defaultRowProviderBody}}
</pre>
      </div>
      <div class="form-group">
        <label for="recipe-onload-fn">Function: OnLoad</label>
        <p class="context">
          This function will be called on page load for the above URL.
        </p>
<pre contentEditable="true" class="recipe-onload-fn" spellcheck="false">
function onLoad(element) {${recipe.onLoadFn || defaultOnLoadFn}}
</pre>
      </div>

      <input type="hidden" value="${recipe.id || ""}" class="recipe-id" />
      <input type="hidden" value="${
        recipe.status || "active"
      }" class="recipe-status" />
      <input type="hidden" value="${
        recipe.autoClip || false
      }" class="recipe-auto-clip" />
      <div class="errors"></div>
      <div class="form-actions">
        <input type="submit" class="btn btn-primary btn-save" value="Save" />
        <input type="button" class="btn btn-default btn-test" value="Test" />
        <input type="button" class="btn btn-default btn-collapse" value="Collapse" />
        <span class="divider"></span>
        <input type="button" class="btn btn-danger btn-delete" value="Delete" />
      </div>
    `;

    this.wrapper_.appendChild(form);
    form.addEventListener(
      "submit",
      this.handleNewRecipeSubmit_.bind(this, form)
    );
    form
      .querySelector(".btn-delete")
      .addEventListener(
        "click",
        this.handleRecipeDelete_.bind(this, form, recipe)
      );
    form
      .querySelector(".btn-test")
      .addEventListener("click", this.handleRecipeTest_.bind(this, form));
    form
      .querySelector(".btn-export")
      .addEventListener("click", this.handleRecipeDownload_.bind(this, form));
    form
      .querySelector(".btn-toggle-status")
      .addEventListener(
        "click",
        this.handleRecipeToggle_.bind(this, form, recipe.id)
      );
    form
      .querySelector(".btn-toggle-clipping")
      .addEventListener(
        "click",
        this.handleRecipeClippingToggle_.bind(this, form, recipe.id)
      );

    form.querySelector(".btn-edit").addEventListener("click", () => {
      form.className = "";
    });
    form.querySelector(".btn-collapse").addEventListener("click", () => {
      if (this.isCreatingViaUrl_()) {
        window.location = "/recipes.html";
      } else {
        form.className = "collapsed";
      }
    });

    if (expand) {
      form.className = "";
      form.querySelector("input").focus();
    } else {
      this.fetchAndRenderClipDataSumary_(form, recipe);
    }
  }

  fetchAndRenderClipDataSumary_(form, recipe) {
    const collectionId = `recipe-${recipe.id}`;
    this.browserEnv_
      .getBackgroundPageP()
      .then((backgroundPage) =>
        backgroundPage.getClipCollectonMetadata(collectionId)
      )
      .then(({ collectionClipCount }) => {
        const clipSummary = form.querySelector(".clip-summary");
        if (collectionClipCount > 0 || recipe.autoClip) {
          clipSummary.classList.remove("hidden");
          clipSummary.innerText = `Times Clipped: ${collectionClipCount}`;
        }
      })
      .catch((err) => this.handleFormError_(form, err));
  }

  getFormValues_(form) {
    let fn = form.querySelector(".recipe-fn").innerText.trim();
    if (
      fn.includes("function element2DataTable(element) {") &&
      fn.endsWith("}")
    ) {
      fn = fn.replace("function element2DataTable(element) {", "");
      fn = fn.slice(0, fn.length - 1);
    }

    let rpfn = form.querySelector(".recipe-rowprovider-fn").innerText.trim();
    if (
      rpfn.includes("function element2RowArray(element) {") &&
      rpfn.endsWith("}")
    ) {
      rpfn = rpfn.replace("function element2RowArray(element) {", "");
      rpfn = rpfn.slice(0, rpfn.length - 1);
    }

    let onLoadFn = form.querySelector(".recipe-onload-fn").innerText.trim();
    if (
      onLoadFn.includes("function onLoad(element) {") &&
      onLoadFn.endsWith("}")
    ) {
      onLoadFn = onLoadFn.replace("function onLoad(element) {", "");
      onLoadFn = onLoadFn.slice(0, onLoadFn.length - 1);
    }

    const getVal = (form, sel) =>
      form.querySelector(`form ${sel}`).value.trim();
    const recipe = {
      id: getVal(form, ".recipe-id"),
      status: getVal(form, ".recipe-status"),
      selector: getVal(form, ".recipe-selector"),
      pagingSelector: getVal(form, ".recipe-paging-selector"),
      fn,
      rpfn,
      onLoadFn,
      name: getVal(form, ".recipe-name"),
      description: getVal(form, ".recipe-desc"),
      urlRegex: getVal(form, ".recipe-url-regex"),
      urlExample: getVal(form, ".recipe-url-example"),
      updated: Date.now(),
      disabled: false,
      autoClip: getVal(form, ".recipe-auto-clip") === "true",
    };
    return recipe;
  }

  handleNewRecipeSubmit_(form, e) {
    e.preventDefault();

    const recipe = this.getFormValues_(form);
    this.saveRecipe_(form, recipe)
      .then(() => this.clearFormError_(form))
      .catch((err) => this.handleFormError_(form, err));

    return false;
  }

  handleRecipeClippingToggle_(form, recipeId) {
    const recipe = this.recipesById_[recipeId];
    recipe.autoClip = !recipe.autoClip;
    this.saveRecipe_(form, recipe)
      .then(() => {
        this.updateRecipeClippingToggleButtons_(form, recipe);
        this.clearFormError_(form);
      })
      .catch((err) => this.handleFormError_(form, err));
  }

  updateRecipeEnabledButton_(form, recipe) {
    form.classList.toggle("form-disabled", recipe.disabled);
    const toggleBtn = form.querySelector(".btn.btn-toggle-status");
    toggleBtn.value = recipe.disabled ? "Enable" : "Disable";
  }

  updateRecipeClippingToggleButtons_(form, recipe) {
    form.querySelector("input.recipe-auto-clip").value = recipe.autoClip;

    const toggleBtn = form.querySelector(".btn.btn-toggle-clipping");
    toggleBtn.value = recipe.autoClip
      ? "Stop Auto-Clipping"
      : "Start Auto-Clipping";
    toggleBtn.className = recipe.autoClip
      ? "btn btn-warning btn-toggle-clipping"
      : "btn btn-success btn-toggle-clipping";
  }

  handleRecipeToggle_(form, recipeId) {
    const recipe = this.recipesById_[recipeId];
    recipe.disabled = !recipe.disabled;
    recipe.autoClip = false;
    this.saveRecipe_(form, recipe)
      .then(() => {
        this.updateRecipeEnabledButton_(form, recipe);
        this.updateRecipeClippingToggleButtons_(form, recipe);
        this.clearFormError_(form);
      })
      .catch((err) => this.handleFormError_(form, err));
  }

  handleRecipeDownload_(form) {
    const recipe = this.getFormValues_(form);
    const simpleName = recipe.name.replace(/[\s-_!,%.':\[\]\{\}?]+/g, "-");

    const blob = new Blob([JSON.stringify(recipe, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    saveAs(blob, `recipe.${simpleName}.json`);
  }

  handleRecipeTest_(form) {
    this.clearFormError_(form);

    const { urlRegex, urlExample, selector, fn, rpfn, onLoadFn } =
      this.getFormValues_(form);

    _testSelector(selector).catch((err) => this.handleFormError_(form, err));
    _testEvalFunction("(element) =>", fn, "Element").catch((err) =>
      this.handleFormError_(form, err)
    );
    _testEvalFunction("(element) =>", rpfn, "Row Element").catch((err) =>
      this.handleFormError_(form, err)
    );
    _testEvalFunction("(element) =>", onLoadFn, "OnLoad").catch((err) =>
      this.handleFormError_(form, err)
    );

    if (!urlRegex || !urlExample) {
      return this.handleFormError_(
        form,
        new Error("Please provide a valid example url and regex")
      );
    }
    const matches = urlExample.match(urlRegex);
    if (matches && matches.length) {
      this.handleFormSuccess_(form);
    } else {
      this.handleFormError_(
        form,
        new Error("The provided regex did not match.")
      );
    }
  }

  handleRecipeDelete_(form, recipe) {
    form.remove();

    if (recipe.id && this.recipesById_[recipe.id]) {
      this.recipesById_[recipe.id].status = "archived";
      this.saveRecipes_(Object.values(this.recipesById_));
    } else {
      // No-op.
    }

    if (this.isWithoutActiveRecipes()) {
      this.renderNoRecipes_();
    }
  }

  saveRecipe_(form, recipe) {
    this.recipesById_[recipe.id] = recipe;
    return this.saveRecipes_(Object.values(this.recipesById_)).then(() => {
      this.handleFormSuccess_(form, recipe);
      return Promise.resolve();
    });
  }

  saveRecipes_(recipes) {
    return this.browserEnv_.setWorld("_recipe_world", { recipes });
  }

  handleFormSuccess_(form, recipe = null) {
    if (recipe) {
      form.querySelector(".collapsed-header .ro-recipe-name").innerText =
        recipe.name || "None";
    }
    form.classList.add("success");
    window.setTimeout(() => {
      form.classList.remove("success");
    }, 1000);
  }

  clearFormError_(form) {
    form.querySelector(".errors").innerHTML = "";
    return Promise.resolve();
  }

  handleFormError_(form, err) {
    if (form && form.classList.contains("collapsed")) {
      return this.handleError_(err);
    }

    const message = err && err.message ? err.message : "Unknown error";
    const wrapper = form.querySelector(".errors");
    wrapper.innerHTML = "";
    wrapper.appendChild(createAlertPane(message, "danger"));
  }

  handleError_(err) {
    const message =
      err && err.message ? `Error caught: ${err.message}` : "Error caught!";
    const wrapper = document.querySelector(".global-errors");
    wrapper.appendChild(createAlertPane(message, "danger", true));
  }
}

////

function _testSelector(selector) {
  try {
    document.querySelector(selector);
  } catch (err) {
    return Promise.reject(
      new Error(`The provided selector is not valid: ${selector}`)
    );
  }
  return Promise.resolve();
}

function _testEvalFunction(sig, functionBody, functionName) {
  try {
    const fullFn = `${sig} { ${functionBody} }`;
    const fn = eval(fullFn);

    try {
      fn(document.body);
    } catch (err) {
      if (err && err.message && err.message.includes("is not defined")) {
        return Promise.reject(new Error(`${functionName}: ${err.message}`));
      }
    }
  } catch (err) {
    return Promise.reject(
      new Error(
        `There's a javascript error in your function (${functionName}).`
      )
    );
  }

  return Promise.resolve();
}

const STOCK_TABLE_FN = `
  // Get the headers
  const headers = Array
      .from(element.querySelectorAll('tr th'))
      .map(th => th.innerText.trim());

  // Get the body rows
  const rows = Array
      .from(element.querySelectorAll('tr'))
      .map(row => {
        return Array
            .from(row.querySelectorAll('td'))
            .map(cell => cell.innerText.trim());
      });
  return [headers, ...rows];
`;

const STOCK_TABLE_RPFN = `
  return Array
      .from(element.querySelectorAll('td'))
      .map(cell => cell.innerText);
`;
