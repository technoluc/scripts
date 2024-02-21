
class BackgroundDataManager {
  constructor() {
    this.activeEditableTable_ = null;
    this.collections_ = {};
  }

  setActiveEditableTable(publicTable) {
    this.activeEditableTable_ = publicTable;
  }

  getActiveEditableTable() {
    return this.activeEditableTable_;
  }

  clearClipCollections() {
    this.collections_ = {};
    return Promise.resolve();
  }

  saveClipData({dataArray, collection, collectionName, sourceUrl}) {
    if (!this.collections_[collection]) {
      this.collections_[collection] = {name: collectionName, rows: 0, data: []};
    }
    this.collections_[collection].rows += dataArray.length;
    this.collections_[collection].data.push({dataArray, sourceUrl, timestamp: Date.now()});
    return this.getClipCollectonMetadata(collection);
  }

  getClipCollections() {
    return Promise.resolve(this.collections_);
  }

  getClipCollectonMetadata(collectionId) {
    let collectionClipCount = 0, rows = 0;
    if (this.collections_[collectionId]) {
      collectionClipCount = this.collections_[collectionId].data.length;
      rows = this.collections_[collectionId].rows;
    }
    return Promise.resolve({
      collectionClipCount,
      rows,
    });
  }
}
