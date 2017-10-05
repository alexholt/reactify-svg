const fs = require('fs');

const Lexer = require('../src/Lexer');
let lexer;

beforeEach(() => {
  lexer = new Lexer(fs.readFileSync('./test/sample-file.svg').toString());
  lexer.tokenize();
});

test('It can find tags', () => {
  expect(lexer.getAST().tag).toEqual('svg');
});

xtest('It can find attributes', () => {
  expect(lexer.getAST().xmlns).toEqual('svg');
});