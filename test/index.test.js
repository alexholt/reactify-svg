const partial = require('lodash/partial');
const path = require('path');

const reactify = require('../index');

test('Applying default args', () => {
  const fileNameArgs = { _: ['file.svg'] };

  expect(reactify.applyDefaultArgs).toThrow();
  expect(reactify.applyDefaultArgs.bind(this, {})).toThrow();
  expect(reactify.applyDefaultArgs.bind(this, fileNameArgs)).not.toThrow();
  expect(reactify.applyDefaultArgs(fileNameArgs).prefix).toEqual(reactify.DEFAULT_PREFIX);
  expect(reactify.applyDefaultArgs(fileNameArgs).outFolder)
    .toEqual(path.resolve(reactify.DEFAULT_OUT_FOLDER));
});

test('Reactifying XML attributes', () => {
  expect(reactify.reactifyAttr('class')).toEqual('className');
});

test('Making a single component from svg', () => {
  const svg = '<svg><title>What!</title></svg>';
  const comps = reactify.makeComponents(svg, 'what.svg', path.resolve('.'), reactify.DEFAULT_PREFIX);
  expect(comps).toHaveLength(1);
  expect(comps[0].contents).toMatch('render()');
});

test('Making two components from svg', () => {
  const svg = '<svg><circle id="component-one" cx="1" cy="1" r="1"/>' +
    '<circle id="component-two" cx="2" cy="2" r="1"/></svg>';
  const comps = reactify.makeComponents(svg, 'foo.svg', path.resolve('.'), reactify.DEFAULT_PREFIX);
  expect(comps).toHaveLength(3);
});

test('Making two components with a different prefix', () => {
  const svg = '<svg><circle id="foo-one" cx="1" cy="1" r="1"/>' +
    '<circle id="foo-two" cx="2" cy="2" r="1"/></svg>';
  const comps = reactify.makeComponents(svg, 'foo.svg', path.resolve('.'), 'foo-');
  expect(comps).toHaveLength(3);
});
