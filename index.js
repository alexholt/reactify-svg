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

// Default Args
const DEFAULT_PREFIX = module.exports.DEFAULT_PREFIX = 'component-';
const DEFAULT_OUT_FOLDER = module.exports.DEFAULT_OUT_FOLDER = '.';
//

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
        prefix: args.prefix || args.p || DEFAULT_PREFIX,
        file,
        outFolder: path.resolve(args['out-folder'] || args.o || DEFAULT_OUT_FOLDER),
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

const reformatNode = (node, parentName, outFolder, files, prefix) => {
    const id = node.getAttribute('id');
    const prefixRegExp = new RegExp(`^${prefix}`);

    if (prefixRegExp.test(id)) {
        const newId = id.replace(prefixRegExp, '');
        node.setAttribute('id', newId);
        const moduleName = newId[0].toUpperCase() + camelCase(newId.substr(1));
        reformatNode(node, moduleName, outFolder, files, prefix);
        files.push({
            filename: `${moduleName}.jsx`,
            contents: fileText(cleanUp(node.outerHTML), moduleName),
            outFolder,
        });
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

    Array.from(node.children).forEach(node => reformatNode(node, parentName, outFolder, files, prefix));
};

const reformat = (text, compName, outFolder, files, prefix) => {
    const doc = parser.parseFromString(text, 'image/svg+xml');
    reformatNode(doc.documentElement, compName, outFolder, files, prefix);
    return doc.documentElement.outerHTML;
};


const saveFile = ({filename, contents, outFolder}) => {
    if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);
    fs.writeFileSync(path.join(outFolder, filename), contents);
    console.info(`${filename} written`);
};

const saveFiles = files => {
    files.forEach(saveFile);
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

const makeComponents = (text, file, outFolder, prefix) => {
    const className = file[0].toUpperCase() + camelCase(file.split('').slice(1).join('').replace(/\.svg$/, ''));
    const filename = `${className}.jsx`;
    const files = []; // [{ filename: string, contents: string, outFolder: string}...]

    files.push({
        filename,
        contents: fileText(cleanUp(reformat(text, className, outFolder, files, prefix)), className),
        outFolder,
    });

    return files;
};

const main = (args) => {
    saveFiles(makeComponents(fs.readFileSync(args.file).toString(), args.file, args.outFolder, args.prefix));
};

if (!module.parent) {
    try {
        main(applyDefaultArgs(parseArgs(process.argv.slice(2))));
    } catch (err) {
        console.log(err);
        process.exit(1);
    }
} else {
  Object.assign(module.exports, {
    applyDefaultArgs,
    makeComponents,
    reformat,
    reactifyAttr,
  });
}
