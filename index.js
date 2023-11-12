const fs = require('fs');
const csv = require('csv-parser');  // allows parsing of csv data
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'bsleung@ucdavis.edu',
        pass: 'SamplePass'
    }
})
const N = 10;  // max number of inputs that can be accepted

let totData = [];

let fileName = "./Sample_Test_File.csv";  // this filename is a placeholder for whatever input the user has

async function read() {
    try {
        if (!fileName.endsWith('.csv')) {
            console.error("ERROR: File must end with .csv");  // error if file inputted does not end with .csv
            return;
        }

        await errorVal();  // error validation, reads csv
        sendData();  // upon completion, sends csv to api
    } catch (error) {
        console.error("ERROR: An error occurred and the file was not sent to the API. Try again.");  // file is unable to be read/found
    }
}

async function errorVal() {
    /*
        Given a read file, the function will terminate with an error if the file does not meet one of these requirements:
        1. File must not be empty
        2. Correct column names
        3. Correct data for each row 
        4. Data file contains 10 or less rows
    */

    const headers = [];
    const correctHeaders = ['Student_Id', 'First_Name', 'Last_Name', 'Email', 'Upload_Date', 'Title_Code', 'Percentage'];

    let rows = 0;  // num of rows in the csv file

    return new Promise((resolve, reject) => {
        const stream = fs.createReadStream(fileName)  // stream through the csv file
            .pipe(csv())
            .on('data', (data) => {
                rows++;

                const rowData = Object.values(data);  // turn into array that can be parsed
                totData.push(data);

                // condition 3
                if (rowData.length != 7) {
                    console.error("Row " + rows + " is invalid. Each row must contain 7 entries.");
                    reject();
                }
                if (!Number.isInteger(parseFloat(rowData[0]))) {
                    console.error("Student_Id in Row " + rows +  " is invalid: " + rowData[0]);
                    reject();
                }
                else if (!typeof(rowData[1]) == 'string') {
                    console.error("First_Name in Row " + rows +  " is invalid: " + rowData[1]);
                    reject();
                }
                else if (!typeof(rowData[2]) == 'string') {
                    console.error("Last_Name in Row " + rows +  " is invalid: " + rowData[2]);
                    reject();
                }
                else if (!(rowData[3].includes('@'))) {
                    console.error("Email in Row " + rows +  " is invalid: " + rowData[3]);
                    reject();
                }
                else if (isNaN(new Date(rowData[4]).getTime())) {
                    console.error("Upload_Date in Row " + rows +  " is invalid: " + rowData[4]);
                    reject;
                }
                else if (!Number.isInteger(parseFloat(rowData[5]))) {
                    console.error("Title_Code in Row " + rows +  " is invalid: " + rowData[5]);
                    reject();
                }
                else if (Number.isInteger(parseFloat(rowData[6]))) {
                    console.error("Percentage in Row " + rows +  " is invalid: " + rowData[6]);
                    reject();
                }
            })
            .on('headers', (headerList) => {
                headers.push(...headerList);

                // condition 2
                if (headers.length !== correctHeaders.length) {
                    console.error("ERROR: headers of csv are incorrect");
                    reject();
                }
                for (let i = 0; i < correctHeaders.length; i++) {
                    if (headers[i] != correctHeaders[i]) {
                        console.error("ERROR: headers of csv are incorrect. Header contains " + headers[i] + " when it should contain " + correctHeaders[i]);
                        reject();
                    }
                }
            })
            .on('end', () => {
                if (rows == 0) {  // condition 1
                    console.error("ERROR: file must not be empty");
                    reject();
                }

                if (rows > N) {  // condition 4
                    console.error("ERROR: input has a larger amount of rows than allowed");
                    reject();
                }
                resolve();
            })
    })
}

async function sendData() {
    let errors = [];
    const url = 'https://ucdavis-iet.com/sample-endpoint-url';
    for (let i = 0; i < totData.length; i++) {  // sends each row to api
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(totData[i]),
            });
        } catch (error) {
            errors.push(`Error found at Row ${i+1} with the following error: ${error.message}`);  // if there is an error, add to array
        }
    }

    if (errors.length != 0) {
        var mail = {
            from: 'bsleung@ucdavis.edu',
            to: 'iet-request@ucdavis.edu',
            subject: 'Error Notification For Fetch Request',
            text: 'Today, an error was found when attempting to complete the following fetch request(s):' + errors
        };
        transporter.sendMail(mail);  // sends mail with errors
        throw new Error("Errors occured during fetch request");
    }

    var mail = {
        from: 'bsleung@ucdavis.edu',
        to: 'iet-request@ucdavis.edu',
        subject: 'Accept Notification For Fetch Request',
        text: 'Upon completion of the fetch request(s) for the inputted CSV file, no errors were found.'
    };
    transporter.sendMail(mail);  // sends mail with confirmation of success
    return;
}

read()