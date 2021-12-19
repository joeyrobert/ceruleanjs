const path = require('path');
const rcedit = require('rcedit');
const { spawn } = require('child_process');
const package = require('../package.json');
const homedir = require('os').homedir();

const EXE = path.join(homedir, '.nexe', process.version.replace('v', ''), 'out/Release/node.exe');

rcedit(EXE, {
    'icon': path.resolve('./build/icon.ico'),
    'file-version': package.version,
    'product-version': package.version,
    'version-string': {
        'CompanyName': package.author,
        'FileDescription': package.description,
        'ProductName': 'CeruleanJS',
        'LegalCopyright': package.author,
    }
});