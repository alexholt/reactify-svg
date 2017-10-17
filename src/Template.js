const fs = require('fs');

module.exports = class Template {

  constructor(text) {
    this.text = text;
  }

  render(model) {
    let text = this.text;

    Object.keys(model)
      .forEach(key =>
        text = text.replace(new RegExp(`@${key}@`, 'g'), model[key])
      );

    return text;
  }
};
