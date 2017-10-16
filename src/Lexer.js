// Spec: https://www.w3.org/TR/xml
// Spec: https://www.w3.org/TR/SVG/single-page.html

const chunk = require('lodash/chunk');

const {
  SELF_CLOSE_BRACKET,
  END_TAG,
  OPEN_BRACKET,
  CLOSE_BRACKET,
  TEXT,
  ASSIGNMENT,
  VALUE,
  TAG,
  ATTR_NAME,
  ATTR_VALUE,
} = require('./tokens');

const TOKENS = [
  {
    value: /^\/>/,
    type: SELF_CLOSE_BRACKET,
  },
  {
    value: /^<\/[a-z][A-Za-z:-]*>/,
    type: END_TAG,
  },
  {
    value: /^</,
    type: OPEN_BRACKET
  },
  {
    value: /^>/,
    type: CLOSE_BRACKET,
  },
  {
    value: /(\u0009|\u000A|\u000D|[\u0020-\u003b]|[\u003d]|[\u003f-\uD7FF]|[\uE000-\uFFFD]|\u0010[\u0000-\uFFFF])+/,
    type: TEXT,
  },
  {
    value: /^=/,
    type: ASSIGNMENT,
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

        const lastToken = this.tokens[this.tokens.length - 1];
        const isAfterOpenBracket = lastToken ? lastToken.type === 'openBracket' : false;

        if (token.type !== TEXT || !isAfterOpenBracket) {
          this.tokens.push({type: token.type, value: match[0]});
        } else {

          // Attempt to find tag and attribute tokens
          const firstSpace = match[0].indexOf(' ');
          let tag = match[0].substring(0, firstSpace);

          const nameOnly = tag.length === 0;
          if (nameOnly) {
            tag = match[0];
          }

          this.tokens.push({type: TAG, value: tag});

          if (!nameOnly) {
            const attrs = chunk(
              match[0].substring(firstSpace + 1).split(/"/).filter(val => val.length !== 0)
              , 2);

            while (attrs.length > 0) {
              const nextPair = attrs.shift();
              const [name, value] = nextPair.map(str => str.trim());

              if (attrs.length === 0 && name === '/' && value === undefined) {
                this.offset--; // The slash got included as an attribute name so back up
                continue;
              }

              this.tokens.push({type: ATTR_NAME, value: name.replace(/=$/, '')});
              this.tokens.push({type: ATTR_VALUE, value});
            }
          }
        }

        this.offset += match[0].length;
        return true;
      });

      if (didNotFindSomething && WHITE_SPACE_REGEXP.test(this.str(this.offset))) {
        throw `Not expecting ${this.str.substr(this.offset, 10)}`;
      }
      if (didNotFindSomething) this.offset++;
    }

    return this.tokens;
  }

  createEmptyNode() {
    return {
      name: '',
      attributes: {},
      children: [],
      toString: this.nodeToString,
    };
  }

  nodeToString() {
    if (this.name === '#TEXT') return `{\`${this.value}\`}`;
    let attrs = Object.entries(this.attributes).map(([name, value]) => `${name}="${value}"`).join(' ');
    if (attrs.length > 0) attrs = ` ${attrs}`;
    if (this.children.length > 0) {
      return `<${this.name}${attrs}>\n${this.children.map(child => child.toString()).join('\n')}\n</${this.name}>`;
    }
    return `<${this.name}${attrs}/>`;
  }

  // <openBracket> <name> [name -> value...] <closeBracket | selfcloseBracket>
  parse() {
    let parentStack = [];
    let cur;
    let node;
    let expects = [OPEN_BRACKET];
    let prevName;

    while (this.tokens.length) {
      let token = this.tokens.shift();
      if (!expects.includes(token.type)) {
        throw `Expecting [${expects}] but got [${token.type}] instead: [${JSON.stringify(token)}]`;
      }

      switch (token.type) {
        case OPEN_BRACKET:
          expects = [TAG];
          node = this.createEmptyNode();

          if (!this.root) {
            this.root = node;
          }
          break;

        case SELF_CLOSE_BRACKET:
          this.addChild(node, cur);
          expects = [OPEN_BRACKET, END_TAG, TEXT];
          break;

        case CLOSE_BRACKET:
          if (cur !== undefined) {
            this.addChild(node, cur);
          }
          parentStack.push(cur);
          cur = node;
          expects = [OPEN_BRACKET, END_TAG, TEXT];
          break;

        case END_TAG:
          expects = [OPEN_BRACKET, END_TAG, TEXT];
          cur = parentStack.pop();
          break;

        case TAG:
          node.name = token.value;
          expects = [ATTR_NAME, CLOSE_BRACKET, SELF_CLOSE_BRACKET];
          break;

        case TEXT:
          node = this.createEmptyNode();
          node.value = token.value;
          node.name = '#TEXT';
          this.addChild(node, cur);
          expects = [OPEN_BRACKET, END_TAG];
          break;

        case ASSIGNMENT:
          expects = [VALUE];
          break;

        case ATTR_VALUE:
          expects = [ATTR_NAME, SELF_CLOSE_BRACKET, CLOSE_BRACKET];
          node.attributes[prevName] = token.value;
          break;

        case ATTR_NAME:
          expects = [ATTR_VALUE];
          prevName = token.value;
          break;
      }
    }
  }

  addChild(child, parent) {
    Object.defineProperty(child, 'parent', {
      // Making this non-enumerable so the circular reference doesn't prevent JSON.stringify from working
      enumerable: false,
      value: parent,
    });
    parent.children.push(child);
  }

  advance() {
    return ++this.offset;
  }

  get token() {
    return this.str[this.offset];
  }

  getAST() {
    if (!this.root) {
      throw 'No AST has been built yet';
    }
    return this.root;
  }

  buildAST() {
    this.tokenize();
    this.parse();
    return this.getAST();
  }

};