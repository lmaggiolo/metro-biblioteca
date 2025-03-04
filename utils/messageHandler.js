class MessageHandler {
  constructor() {
    this.messages = { error: [], success: [], modal: '' };
  }

  addError(message) {
    this.messages.error.push(message);
  }

  addSuccess(message) {
    this.messages.success.push(message);
  }

  setModal(modal) {
    this.messages.modal = modal;
  }

  getMessages() {
    return this.messages;
  }

  clear() {
    this.messages = { error: [], success: [], modal: '' };
  }
}

module.exports = MessageHandler;
