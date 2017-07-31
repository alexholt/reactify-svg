#! /usr/bin/env node
// TODO: Remove <title> and <desc>

const fs = require('fs');
const path = require('path');
const camelCase = require('lodash/camelCase');
const {JSDOM} = require('jsdom');

const attrsMap= require('./svgReactAttrs');

const jsdom = new JSDOM();
const parser = new jsdom.window.DOMParser;
const document = jsdom.window.document;

const dependencyMap = {};

const reactifyAttr = (attr) => {
    if (attrsMap[attr]) {
        return attrsMap[attr];
    }
    return attr;
};

const file = path.basename(process.argv[2]);
const outFolder = process.argv[3];

const fileText = (renderBody, className) => {
    const deps = ["import React, {Component} from 'react';"];
    if (dependencyMap[className]) {
        dependencyMap[className].forEach(dep => deps.push(`import ${dep} from './${dep.toLowerCase()}';`));
    }

    return (
/////
`${deps.join('\n')}

export default class ${className} extends Component {

  render() {
    return (
      ${renderBody.split('\n').join('\n      ')}
    );
  }
}
`
////
);
};

const reformatNode = (node, parentName) => {
    const id = node.getAttribute('id');

    if (/^component-/.test(id)) {
        const newId = id.replace(/^component-/, '');
        node.setAttribute('id', newId);
        const moduleName = newId[0].toUpperCase() + camelCase(newId.substr(1));
        reformatNode(node, moduleName);
        saveFile(`${newId}.jsx`, fileText(cleanUp(node.outerHTML), moduleName));
        node.parentNode.replaceChild(document.createTextNode(`<${moduleName}/>`), node);

        if (!dependencyMap[parentName]) {
            dependencyMap[parentName] = [];
        }

        dependencyMap[parentName].push(moduleName);

        return;
    }

    if (node.nodeName === '#comment') {
        node.parentNode.removeChild(node);
        return;
    }

    Array.from(node.attributes).forEach(attr => {
        const name = reactifyAttr(attr.name);
        let value = attr.value;
        node.attributes.removeNamedItem(attr.name);

        if (name === 'style') {
            value = JSON.stringify(value.split(';').reduce((acc, cur) => {
                const [prop, val] = cur.split(':');
                if (val && prop) {
                    acc[prop.trim()] = val.trim();
                }
                return acc;
            }, {}));
        }
        node.setAttribute(name, value);
    });

    Array.from(node.children).forEach(node => reformatNode(node, parentName));
};

const reformat = (text, compName) => {
    const doc = parser.parseFromString(text, 'image/svg+xml');
    reformatNode(doc.documentElement, compName);
    return doc.documentElement.outerHTML;
};


const saveFile = (filename, text) => {
    fs.writeFileSync(path.join(outFolder, filename), text);
};

const cleanUp = (text) => {
    return text
      // Quick and dirty tags to self-closing tags when the node is empty
      .replace(/><\/[^>]+>/g, '/>')

      // Switch to single quotes
      .replace(/"/g, "'")

      // Unescape the escaped characters
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&quot;/g, '"')

      // Remove comments
      .replace(/<!--.*-->/g, '')

      // Fixup style
      .replace(/style='([^']+)'/g, 'style={$1}')
    ;
};

const makeComponentFile = (text, filename) => {
    const className = file[0].toUpperCase() + camelCase(file.split('').slice(1).join('').replace(/\.svg$/, ''));

    if (!filename) {
        filename = 'Out.jsx';
    }

    saveFile(
        filename,
        fileText(cleanUp(reformat(text, className)), className)
    );
};

makeComponentFile(fs.readFileSync(file).toString());
