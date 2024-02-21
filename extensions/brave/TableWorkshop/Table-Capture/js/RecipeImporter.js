class RecipeImporter {
  constructor(dropzone) {
    this.dropzone_ = dropzone;
    this.recipeHandlers_ = [];
    this.errorHandlers_ = [];

    this.bindToDropzone_();
  }

  addOnDropHandler(handler) {
    this.recipeHandlers_.push(handler);
  }

  addOnErrorHandler(handler) {
    this.errorHandlers_.push(handler);
  }

  bindToDropzone_() {
    this.dropzone_.addEventListener(
      "dragover",
      this.handleDragOver_.bind(this),
      false
    );
    this.dropzone_.addEventListener(
      "dragleave",
      this.handleDragLeave_.bind(this),
      false
    );
    this.dropzone_.addEventListener(
      "drop",
      this.handleManualFileDrop_.bind(this),
      false
    );

    document.querySelector(".dropzone-mask").addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,json,application/json";
      input.onchange = (_this) => {
        const files = Array.from(input.files);
        this.handleFileAddition_(files);
      };
      input.click();
    });
  }

  handleDragOver_(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";

    this.dropzone_.classList.add("file-drag-over");
  }

  handleDragLeave_() {
    this.dropzone_.classList.remove("file-drag-over");
  }

  handleManualFileDrop_(evt) {
    this.handleDragLeave_();
    evt.stopPropagation();
    evt.preventDefault();
    this.handleFileAddition_(evt.dataTransfer.files);
  }

  handleFileAddition_(fileList) {
    Array.from(fileList)
      .filter((file) => file.name.endsWith(".json"))
      .forEach((file) => this.readFile_(file));
  }

  readFile_(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = e.target.result;
        if (data) {
          data = data.replace("data:application/json;base64,", "");
          const recipe = JSON.parse(atob(data));
          this.handleRecipeImport_(recipe);
        }
      } catch (err) {
        this.handleFileError_(file, err);
      }
    };
    reader.readAsDataURL(file);
  }

  handleRecipeImport_(recipe) {
    this.recipeHandlers_.forEach((handler) => handler(recipe));
  }

  handleFileError_(file, err) {
    this.errorHandlers_.forEach((handler) => handler({ file, err }));
  }
}
