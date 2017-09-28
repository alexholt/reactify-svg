#! /usr/bin/env node
// TODO: Remove <title> and <desc>

const fs = require('fs');
const {JSDOM} = require('jsdom');
const path = require('path');
const camelCase = require('lodash/camelCase');
const parseArgs = require('minimist');

const attrsMap= require('./src/svg-react-attrs');

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

const applyDefaultArgs = (args) => {
    const file = args._[0];

    if (!file) throw 'Missing required argument [filename]';
    return {
        prefix: args.prefix || args.p || 'component-',
        file,
        outFolder: path.resolve(args['out-folder'] || args.o || '.'),
    };
};

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
);};

const reformatNode = (node, parentName, outFolder) => {
    const id = node.getAttribute('id');

    if (/^component-/.test(id)) {
        const newId = id.replace(/^component-/, '');
        node.setAttribute('id', newId);
        const moduleName = newId[0].toUpperCase() + camelCase(newId.substr(1));
        reformatNode(node, moduleName);
        saveFile(`${moduleName}.jsx`, fileText(cleanUp(node.outerHTML), moduleName), outFolder);
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

    Array.from(node.children).forEach(node => reformatNode(node, parentName, outFolder));
};

const reformat = (text, compName, outFolder) => {
    const doc = parser.parseFromString(text, 'image/svg+xml');
    reformatNode(doc.documentElement, compName, outFolder);
    return doc.documentElement.outerHTML;
};


const saveFile = (filename, text, outFolder) => {
    if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);
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

const makeComponentFile = (text, file, outFolder) => {
    const className = file[0].toUpperCase() + camelCase(file.split('').slice(1).join('').replace(/\.svg$/, ''));
    const filename = `${className}.jsx`;

    saveFile(
        filename,
        fileText(cleanUp(reformat(text, className, outFolder)), className),
        outFolder
    );
};

const main = (args) => {
  makeComponentFile(fs.readFileSync(args.file).toString(), args.file, args.outFolder);
};

try {
  main(applyDefaultArgs(parseArgs(process.argv.slice(2))));
} catch (err) {
  console.log(err);
  process.exit(1);
}
