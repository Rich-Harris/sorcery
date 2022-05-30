const child_process = require('child_process');
const fse = require('fs-extra');

const fileREADME = fse.readFileSync('README.md').toString();
const filePACKAGEJSON = fse.readFileSync('package.json');

try {
    let newFileREADME = fileREADME.replace(/sourcery/g, 'sorcery');
    fse.writeFileSync('README.md', newFileREADME);

    const contentPACKAGEJSON = JSON.parse(filePACKAGEJSON.toString());
    contentPACKAGEJSON.name = contentPACKAGEJSON.name.replace(/sourcery/g, 'sorcery');
    contentPACKAGEJSON.bin['sorcery-map'] = contentPACKAGEJSON.bin['sourcery-map'];
    delete contentPACKAGEJSON.bin['sourcery-map'];
    fse.writeJSONSync('package.json', contentPACKAGEJSON);

    child_process.execSync('npm run deploy');
}
catch (err) {
}

fse.writeFileSync('README.md', fileREADME);
fse.writeFileSync('package.json', filePACKAGEJSON);

child_process.execSync('npm run deploy');
