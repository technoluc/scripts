
/**
 * Usage:
 *   this.frameBridge_ = new SelectionFrameBridge();
 *   this.frameBridge_.bindToEvent(WorkshopEvent.FRAME_EXPAND, this.handleFrameExpandBridgeRequest_.bind(this));
 */

class SelectionFrameBridge {
  constructor() {
    this.callbacks_ = {};
    window.addEventListener("message", this.handleBridgeMessage_.bind(this), true);
  }

  bindToEvent(event, cb) {
    if (!this.callbacks_[event]) {
      this.callbacks_[event] = [];
    }
    this.callbacks_[event].push(cb);
  }

  fireEvent_(event, data) {
    if (this.callbacks_[event]) {
      this.callbacks_[event].forEach(cb => cb(data));
    }
  }

  postToParentOrSelf(message) {
    if (window.parent) {
      this.postToParent(message);
    } else {
      this.handleBridgeMessage_({data: message});
    }
  }

  postToParent(message) {
    window.parent && window.parent.postMessage(message, '*');
  }

  handleBridgeMessage_(e) {
    if (!e || !e.data) {
      return;
    }
    const data = e.data;
    const action = data.action;
    this.fireEvent_(action, data);
  }
}
