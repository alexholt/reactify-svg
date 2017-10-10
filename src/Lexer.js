const TAG = 'tag';
const ATTR = 'attr';

const OPEN_TAG = 'openTag';
const END_TAG = 'endTag';
const CLOSE_TAG = 'closeTag';
const SELF_CLOSE_TAG = 'selfCloseTag';
const NAME = 'name';
const ASSIGNMENT = 'assignment';
const VALUE = 'value';

const DELIMITERS = {
  TAG: {
    startTokens: '<',
    endTokens: [' ', '>', '/>'],
    error: 'Expected either "/>", ">", or an attribute name',
  },
  ATTR: {
    startTokens: /[a-zA-Z:-]+/,
    endTokens: [' ', '>', '/>'],
    error: 'Expected either "=", or " "',
  },
};

const TOKENS = [
  {
    value: /^\/>/,
    type: SELF_CLOSE_TAG,
  },
  {
    value: /^<\/[a-z][A-Za-z:-]*>/,
    type: END_TAG,
  },
  {
    value: /^</,
    type: OPEN_TAG
  },
  {
    value: /^>/,
    type: CLOSE_TAG,
  },
  {
    value: /^[a-z][A-Za-z:-]*/,
    type: NAME,
  },
  {
    value: /^=/,
    type: ASSIGNMENT,
  },
  {
    value: /^"[^"]+"/,
    type: VALUE,
  },
];

const WHITE_SPACE_REGEXP = /\s/;

module.exports = class Lexer {

  constructor(str) {
    this.offset = 0;
    this.str = str;
    this.mode = TAG;
    this.tokens = [];
  }

  advancePastWhitespace() {
    while (WHITE_SPACE_REGEXP.test(this.token)) {
      this.advance();
    }
  }

  tokenize() {
    while (this.offset < this.str.length) {
      if (this.str.substr(this.offset)[0].match(WHITE_SPACE_REGEXP)) {
        this.offset++;
        continue;
      }

      const didNotFindSomething = !TOKENS.find(token => {
        const match = token.value.exec(this.str.substr(this.offset));
        if (match === null) {
          return false;
        }
        this.tokens.push({type: token.type, value: match[0]});
        this.offset += match[0].length;
        return true;
      });

      if (didNotFindSomething) this.offset++;
    }
  }

  createEmptyNode() {
    return {
      name: '',
      attributes: [],
      children: [],
    };
  }

  // <openTag> <name> [name -> value...] <closeTag | selfCloseTag>
  parse() {
    let parentStack = [];
    let cur;
    let node;
    let expects = [OPEN_TAG];

    while (this.tokens.length) {
      let token = this.tokens.shift();
      if (!expects.includes(token.type)) {
        throw `Expecting [${expects}] but got [${token.type}] instead: [${JSON.stringify(token)}]`;
      }

      switch (token.type) {
        case OPEN_TAG:
          expects = [NAME];
          node = this.createEmptyNode();

          if (!this.root) {
            this.root = node;
          }
          break;

        case SELF_CLOSE_TAG:
          cur.children.push(node);
          expects = [OPEN_TAG, END_TAG];
          break;

        case CLOSE_TAG:
          if (cur !== undefined) {
            cur.children.push(node);
          }
          parentStack.push(cur);
          cur = node;
          expects = [OPEN_TAG, END_TAG];
          break;

        case END_TAG:
          expects = [OPEN_TAG, END_TAG];
          cur = parentStack.pop();
          break;

        case NAME:
          if (node.name === 'circle') debugger;
          if (node.name === '') {
            node.name = token.value;
            expects = [NAME, CLOSE_TAG, SELF_CLOSE_TAG, ASSIGNMENT];
          } else {
            node.attributes.push({
              name: token.value,
              value: '',
            });
            expects = [ASSIGNMENT];
          }
          break;

        case ASSIGNMENT:
          expects = [VALUE];
          break;

        case VALUE:
          expects = [NAME, SELF_CLOSE_TAG, CLOSE_TAG];
          node.attributes[node.attributes.length - 1].value = token.value.substring(1, token.value.length - 1);
          break;
      }
    }
  }

  tokenize_() {
    if (this.offset >= this.str.length) {
      return;
    }

    switch (this.mode) {
      case TAG:
        this.lookForTag();
        break;
      case ATTR:
        this.lookForAttribute();
        break;
      default:
        throw `Mode [${this.mode}] has not been implemented`;
    }
  }

  lookForTag() {
    let tag = '';

    this.advancePastWhitespace();

    if (this.token === DELIMITERS.TAG.startTokens) {
      this.advance();
    }

    while (!DELIMITERS.TAG.endTokens.includes(this.token)) {
      tag += this.token;
      this.advance();
    }

    this.tokens.push({
      tag,
      attributes: [],
    });

    this.advancePastWhitespace();

    if (!DELIMITERS.TAG.endTokens.includes(this.token)) {
      this.mode = ATTR;
    } else if (token === '>') {
      this.advance();
    }

    this.tokenize();
  }

  lookForAttribute() {
    let attr = '';

    while (!DELIMITERS.ATTR.endTokens.includes(this.token) && this.token !== '=') {
      attr += this.token;
      this.advance();
    }

    if (this.token !== '=') {
      throw `Expected "=" but found "${this.token}" at offset: ${this.offset}`;
    }

    this.advance();

    if (this.token !== '"') {
      throw `Expected """ but found "${this.token}" at offset: ${this.offset}`;
    }

    this.advance();

    let val = '';
    while (this.token !== '"') {
      val += this.token;
      this.advance();
    }

    this.advance();

    this.cur.attributes.push({name: attr, value: val});

    this.advancePastWhitespace();

    if (this.token === '>') {
      this.advance();
    }

    if (!DELIMITERS.ATTR.startTokens.test(this.token)) {
      this.mode = TAG;
    }

    this.tokenize();
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