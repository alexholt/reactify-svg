const expect = require('chai').expect;
const partial = require('lodash/partial');
const path = require('path');

const reactify = require('../index');

describe('End to end', () => {
  it('should have default args', () => {
    const fileNameArgs = { _: ['file.svg'] };
  
    expect(reactify.applyDefaultArgs).to.throw();
    expect(reactify.applyDefaultArgs.bind(this, {})).to.throw();
    expect(reactify.applyDefaultArgs.bind(this, fileNameArgs)).not.to.throw();
    expect(reactify.applyDefaultArgs(fileNameArgs).prefix).to.equal(reactify.DEFAULT_PREFIX);
    expect(reactify.applyDefaultArgs(fileNameArgs).outFolder)
      .to.equal(path.resolve(reactify.DEFAULT_OUT_FOLDER));
  });
  
  it('should reactifying XML attributes', () => {
    expect(reactify.reactifyAttr('class')).to.equal('className');
  });
  
  it('should make a single component from svg', () => {
    const svg = '<svg><title>What!</title></svg>';
    const comps = reactify.makeComponents(svg, 'what.svg', path.resolve('.'), reactify.DEFAULT_PREFIX);
    expect(comps).to.have.lengthOf(1);
    expect(comps[0].contents).to.match(/render\(\)/);
  });
  
  it('should make two components from svg', () => {
    const svg = '<svg><circle id="component-one" cx="1" cy="1" r="1"/>' +
      '<circle id="component-two" cx="2" cy="2" r="1"/></svg>';
    const comps = reactify.makeComponents(svg, 'foo.svg', path.resolve('.'), reactify.DEFAULT_PREFIX);
    expect(comps).to.have.lengthOf(3);
  });
  
  it('should make two components with a different prefix', () => {
    const svg = '<svg><circle id="foo-one" cx="1" cy="1" r="1"/>' +
      '<circle id="foo-two" cx="2" cy="2" r="1"/></svg>';
    const comps = reactify.makeComponents(svg, 'foo.svg', path.resolve('.'), 'foo-');
    expect(comps).to.have.lengthOf(3);
  });
});
