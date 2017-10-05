const TAG = 'tag';

const DELIMITERS = {
  TAG: {
    startTokens: '<',
    endTokens: [' ', '>', '/>'],
    name: TAG,
    error: 'Expected either "/>", ">", or an attribute name',
  },
};

const WHITE_SPACE_REGEXP = /\s/;

module.exports = class Lexer {

  constructor(str) {
    this.offset = 0;
    this.str = str;
    this.mode = TAG;
    this.root = {};
  }

  tokenize() {
    while (WHITE_SPACE_REGEXP.test(this.token)) {
      this.advance();
    }

    switch (this.mode) {
      case TAG:
        this.lookForTag();
        break;
      default:
        throw `Mode [${this.mode}] has not been implemented`
    }
  }

  lookForTag() {
    let tag = '';

    if (this.token === DELIMITERS.TAG.startTokens) {
      this.advance();
    } else {
      throw 'Expected "<"';
    }

    while (!DELIMITERS.TAG.endTokens.includes(this.token) && this.offset < 10) {
      try {
        tag += this.token;
      } catch (err) {
        throw tag;
      }
      this.advance();
    }

    this.root = {
      tag,
      children: [],
      attributes: [],
    };
  }

  advance() {
    return ++this.offset;
  }

  get token() {
    return this.str[this.offset];
  }

  getAST() {
    return this.root;
  }
};