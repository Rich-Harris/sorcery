const child_process = require('child_process');
const fse = require('fs-extra');

const fileREADME = fse.readFileSync('README.md').toString();
let newFileREADME = fileREADME.replace(/sourcery/g, 'sorcery');
fse.writeFileSync('_README.md', newFileREADME);

const filePACKAGEJSON = fse.readFileSync('package.json');
const contentPACKAGEJSON = JSON.parse(filePACKAGEJSON.toString());
contentPACKAGEJSON.name = contentPACKAGEJSON.name.replace(/sourcery/g, 'sorcery');
contentPACKAGEJSON.bin['sorcery-map'] = contentPACKAGEJSON.bin['sourcery-map'];
delete contentPACKAGEJSON.bin['sourcery-map'];
fse.writeJSONSync('_package.json', contentPACKAGEJSON);

// child_process.execSync('npm pack');

fse.writeFileSync('README.md', fileREADME);
fse.writeFileSync('package.json', filePACKAGEJSON);

// child_process.execSync('npm pack');

// child_process.execSync()
