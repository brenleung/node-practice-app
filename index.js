const { readFile } = require('fs').promises;

let fileName = "./Sample_Test_File.csv";  // this filename is a placeholder for whatever input the user  has

async function read() {
    try {
        if (!fileName.endsWith('.csv')) {
            console.error("ERROR: File must end with .csv");  // error if file inputted does not end with .csv
            return;
        }

        const file = await readFile(fileName, 'utf8');
        errorVal(file);  // calls error validation function to check file
    } catch (error) {
        console.error("ERROR: File not found.");  // file is unable to be read/found
    }
}

async function errorVal(file) {
    /*
        Given a read file, the function will terminate with an error if the file does not meet one of these requirements:
        1. File must not be empty
        2. Correct column names
        3. Correct data for each row 
        4. Data file contains 10 or less rows
    */

    if (file.length === 0) {  // condition 1
        console.error("ERROR: File must not be empty.");
        return;
    }
    console.log("All good!");
}

read()