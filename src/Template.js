const fs = require('fs');

module.exports = class Template {
  constructor(filename) {
    this.filename = filename;
  }

  loadFile() {
    this.file = fs.readFileSync(this.filename).toString();
    return this;
  }

  render(model) {
    if (!this.file) throw 'File has not been loaded';
    let file = this.file;
    Object.keys(model).forEach(key => file = file.replace(new RegExp(`@${key}@`, 'g'), model[key]));
    return file;
  }
};