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

const fileText = renderBody => {
    const className = file[0].toUpperCase() + camelCase(file.split('').slice(1).join('').replace(/\.svg$/, ''));

    return `import React, {Component} from 'react';

export default class ${className} extends Component {

  render() {
    return (
      ${renderBody}
    );
  }
}
`};

const reformatNode = (node) => {
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


fs.writeFileSync('out.jsx',
    fileText(
        reformat(
            fs.readFileSync(file).toString()
        )
        // Quick and dirty tags to self-closing tags when the node is empty
        .replace(/><\/[^>]+>/g, '/>')
        // Switch to single quotes
        .replace(/"/g, "'")
        .split('\n').join('\n      ')
    )
);
