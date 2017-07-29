// TODO: Remove <title> and <desc>

const fs = require('fs');
const camelCase = require('lodash/camelCase');
const {JSDOM} = require('jsdom');

const attrsMap= require('./svgReactAttrs');

const parser = new (new JSDOM().window.DOMParser);
const document = new JSDOM().window.document;

const reactifyAttr = (attr) => {
    if (attrsMap[attr]) {
        return attrsMap[attr];
    }
    return attr;
};

const file = process.argv[2];

const fileText = (renderBody, className) => {

    return `import React, {Component} from 'react';

export default class ${className} extends Component {

  render() {
    return (
      ${renderBody.split('\n').join('\n      ')}
    );
  }
}
`
};

const reformatNode = (node) => {
    const id = node.getAttribute('id');

    if (/^component-/.test(id)) {
        const newId = id.replace(/^component-/, '');
        node.setAttribute('id', newId);
        reformatNode(node);
        const moduleName = newId[0].toUpperCase() + camelCase(newId.substr(1));
        saveFile(`${newId}.jsx`, fileText(cleanUp(node.outerHTML), moduleName));
        node.parentNode.replaceChild(document.createTextNode(`<${moduleName}/>`), node);
        return;
    }

    Array.from(node.attributes).forEach(attr => {
        const name = reactifyAttr(attr.name);
        const value = attr.value;
        node.attributes.removeNamedItem(attr.name);
        node.setAttribute(name, value);
    });

    Array.from(node.children).forEach(reformatNode);
};

const reformat = (text) => {
    const doc = parser.parseFromString(text, 'image/svg+xml');
    reformatNode(doc.documentElement);
    return doc.documentElement.outerHTML;
};


const saveFile = (filename, text) => {
    fs.writeFileSync(filename, text);
};

const cleanUp = (text) => {
    return text
      // Quick and dirty tags to self-closing tags when the node is empty
      .replace(/><\/[^>]+>/g, '/>')

      // Switch to single quotes
      .replace(/"/g, "'")

      // Unescape the forbidden characters
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
    ;
};

const makeComponentFile = (text, filename = 'out.jsx') => {
    const className = file[0].toUpperCase() + camelCase(file.split('').slice(1).join('').replace(/\.svg$/, ''));

    saveFile(
        filename,
        fileText(cleanUp(reformat(text)), className)
    );
};

makeComponentFile(fs.readFileSync(file).toString());
