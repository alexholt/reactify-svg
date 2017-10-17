const expect = require('chai').expect;

const Template = require('../src/Template');

let template;

describe('Template', () => {

  beforeEach(() => {
    template = new Template(`
      Foo
      What
      @replaceMe@
    `);
  });

  it('can replace tokens in the text', () => {
    const replaceMe = (Math.random() * 100).toString(16);
    const out = template.render({replaceMe});
    expect(out.indexOf(replaceMe)).to.be.above(-1);
  });
});
