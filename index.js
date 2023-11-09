// be able to read file and validate it

const { readFile } = require('fs').promises;

async function read() {
    const file = await readFile('./Sample_Test_File.csv', 'utf8');
    console.log(file);
}

read()