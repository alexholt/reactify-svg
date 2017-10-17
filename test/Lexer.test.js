const expect  = require('chai').expect;
const fs = require('fs');

const Lexer = require('../src/Lexer');
const TOKENS = require('../src/tokens');

const sampleSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="259" height="289" viewBox="0 0 259 289" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
      <path id="a" d="M136.5,142 L136.5,29 L117,29 L117,142 L34,142 L34,154 L117,154 L117,231.699219 L136.5,231.699219 L136.5,154 L220,154 L220,142 L136.5,142 Z"/>
    </defs>
    <g id="component-circles" fill="none" fill-rule="evenodd">
      <circle cx="29.5" cy="29.5" r="28.5" fill="#D8D8D8" stroke="#979797"/>
      <circle cx="220.189" cy="57.189" r="37.189" fill="#D8D8D8" stroke="#979797"/>
      <circle cx="235.754" cy="209.754" r="21.754" fill="#D8D8D8" stroke="#979797"/>
      <circle cx="34.744" cy="254.744" r="33.744" fill="#D8D8D8" stroke="#979797"/>
      <use fill="#D8D8D8" xlink:href="#a"/>
      <path stroke="#979797" d="M136,29.5 L117.5,29.5 L117.5,142.5 L34.5,142.5 L34.5,153.5 L117.5,153.5 L117.5,231.199219 L136,231.199219 L136,153.5 L219.5,153.5 L219.5,142.5 L136,142.5 L136,29.5 Z"/>
    </g>
  </svg>
`;

let lexer;

describe('Lexer', () => {
  beforeEach(() => {
    lexer = new Lexer(sampleSVG);
  });
  
  it('can tokenize', () => {
    const tokens = lexer.tokenize();
    expect(tokens[0].type).to.equal(TOKENS.OPEN_BRACKET);
    expect(tokens[1].type).to.equal(TOKENS.TAG);
    expect(tokens[2].type).to.equal(TOKENS.ATTR_NAME);
    expect(tokens[2].value).to.equal('xmlns');
    expect(tokens[14].value).to.equal('defs');
    expect(tokens[15].type).to.equal(TOKENS.CLOSE_BRACKET);
  });
  
  it('can find tags', () => {
    const root = lexer.buildAST();
    expect(root.name).to.equal('svg');
    expect(root.children[0].name).to.equal('defs');
  });
  
  it('can find attributes', () => {
    const ast = lexer.buildAST();
    expect(ast.attributes.xmlns).to.equal('http://www.w3.org/2000/svg');
    expect(ast.attributes.width).to.equal('259');
  });
});
