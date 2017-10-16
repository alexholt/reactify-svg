#! /usr/bin/env node
// TODO: Remove <title> and <desc>

const fs = require('fs');
const path = require('path');
const camelCase = require('lodash/camelCase');
const parseArgs = require('minimist');

const attrsMap = require('./src/svg-react-attrs');
const Lexer = require('./src/Lexer');
const Template = require('./src/template');

const {TAG} = require('./src/tokens');

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
    dependencyMap[className].forEach(dep => deps.push(`import ${dep} from './${dep}';`));
  }

  const view = new Template('tpl/ClassComponent.jsx.tpl');
  view.loadFile();
  const model = {
    deps: deps.join('\n'),
    name: className,
    body: renderBody.split('\n').join('\n      '),
  };

  return view.render(model);
};

const reformatNode = (node, parentName, outFolder, files, prefix) => {
  const id = node.attributes.id;
  const prefixRegExp = new RegExp(`^${prefix}`);

  if (prefixRegExp.test(id)) {
    const newId = id.replace(prefixRegExp, '');
    node.attributes.id = newId;
    const moduleName = newId[0].toUpperCase() + camelCase(newId.substr(1));
    reformatNode(node, moduleName, outFolder, files, prefix);

    files.push({
      filename: `${moduleName}.jsx`,
      contents: fileText(cleanUp(`${node}`), moduleName),
      outFolder,
      className: moduleName,
    });

    const index = node.parent.children.indexOf(node);
    node.parent.children[index] = `<${moduleName}/>`;

    if (!dependencyMap[parentName]) {
      dependencyMap[parentName] = [];
    }

    dependencyMap[parentName].push(moduleName);

    return node;
  }

  if (node.name === '#comment') {
    // TODO: Reactifiy comments
    node.parentNode.removeChild(node);
    return node;
  }

  Object.entries(node.attributes).forEach(([name, value]) => {
    delete node.attributes[name];
    name = reactifyAttr(name);

    if (name === 'style') {
      value = JSON.stringify(value.split(';').reduce((acc, cur) => {
        const [prop, val] = cur.split(':');
        if (val && prop) {
          acc[prop.trim()] = val.trim();
        }
        return acc;
      }, {}));
    }

    node.attributes[name] = value;
  });

  node.children.forEach(node => reformatNode(node, parentName, outFolder, files, prefix));
  return node;
};

const reformat = (text, compName, outFolder, files, prefix) => {
  const lexer = new Lexer(text);
  const ast = lexer.buildAST();
  return reformatNode(ast, compName, outFolder, files, prefix);
};

const saveFile = ({filename, contents, outFolder}) => {
  if (!fs.existsSync(outFolder)) fs.mkdirSync(outFolder);
  fs.writeFileSync(path.join(outFolder, filename), contents);
  console.info(`${filename} written`);
};

const saveFiles = files => {
  files.forEach(saveFile);
  return files;
};

const cleanUp = (text) => {
  return text

    // Put the contents of style tags in quotes since they include {} characters
    .replace(/<style>/g, '<style>{`')
    .replace(/<\/style>/g, '`}</style>')

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
  const revisedAST = reformat(text, className, outFolder, files, prefix);

  files.push({
    filename,
    contents: fileText(revisedAST.toString(), className),
    outFolder,
    className,
  });

  return files;
};

const main = (args) => {
  const files = makeComponents(
    fs.readFileSync(args.file).toString(),
    path.basename(args.file),
    args.outFolder,
    args.prefix
  );

  const view = new Template('tpl/index.jsx.tpl');
  view.loadFile();

  const rootComp = files[files.length - 1];

  const deps = [
    "import React from 'react';",
    "import ReactDOM from 'react-dom';",
    '\n',
    `import ${rootComp.className} from './${rootComp.filename}';`
  ].join('\n');

  const model = {
    deps,
    rootComp: rootComp.className,
  };

  files.push({
    filename: 'index.js',
    contents: view.render(model),
    outFolder: args.outFolder,
  });

  saveFiles(files);

};

if (!module.parent) {
  try {
    main(applyDefaultArgs(parseArgs(process.argv.slice(2))));
  } catch (err) {
    console.error(err.message);
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
