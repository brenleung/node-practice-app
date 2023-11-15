const fs = require('fs');
const csv = require('csv-parser');  // allows parsing of csv data

const express = require('express');  // add-on to allow for incoming requests
const app = express();
const port = process.env.PORT || 3000
app.use(express.json());  // allow for parsing JSON in incoming requests

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

app.get('/parse-csv', (req, res) => {
    res.send("Sample text");
})

app.post('/parse-csv', async (req, res) => {  // waits for request that contains filename
    const fileName = JSON.stringify(req);

    try {
        await read(fileName);
        return res.send("File processed. Check email for full results.");
    } catch {
        return res.send("File was not properly processed. An error occurred.");
    }
})

async function read(fileName) {
    try {
        // 4a. Validate input file is in correct file format e.g. sample_file.csv.
        if (!fileName.endsWith('.csv')) {
            console.error("ERROR: File must end with .csv");
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

                // 4d. Validate data for each row record is valid if not, display the offending error.
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
                    reject();
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

                // 4c. Validate correct header(column) file fields names.
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
                // 4b. Validate Uploaded data file is not empty / blank.
                if (rows == 0) { 
                    console.error("ERROR: file must not be empty");
                    reject();
                }

                // 4e. Validate data file is not more than N records. e.g. N=10.
                if (rows > N) { 
                    console.error("ERROR: input has a larger amount of rows than allowed");
                    reject();
                }
                resolve();
            })
    })
}

async function sendData() {
    let errors = [];
    for (let i = 0; i < totData.length; i++) {
        try {
            // 5a. Authenticate to another API enabled backend environment. Feel free to use a placeholder (not a real one) endpoint url (https://ucdavis-iet.com/sample-endpoint-url) in your code.
            const response = await fetch('https://ucdavis-iet.com/sample-endpoint-url', {
                // 5b. Send each processed row record to the API using either GET / POST.
                method: 'POST',
                headers: {
                    'Content-Type': "application/json",
                    'authorization': ('Bearer ' + 'sample-api-key')
                },
                body: JSON.stringify(totData[i]),
            });

            // 6a. Verify Success / Error for all records.
            if (!response.ok) {
                errors.push(`Error found at Row ${i+1} with the following error: ${response.statusText}`);
            }
        } catch (error) {
            errors.push(`Error found at Row ${i+1} with the following error: ${error.message}`);
        }
    }

    // 6c. Generate & send an error notification email to system admin for any failed records if any. (triggers if error array has anything inside of it)
    if (errors.length != 0) {
        var mail = {
            from: 'bsleung@ucdavis.edu',
            to: 'iet-request@ucdavis.edu',
            subject: 'Error Notification For Fetch Request',
            text: 'Today, an error was found when attempting to complete the following fetch request(s):' + errors.join(', ')
        };
        transporter.sendMail(mail);  // sends mail with errors
        throw new Error("Errors occured during fetch request");
    }

    // 6b. Send Error Notification to a system admin email upon successful completion.
    var mail = {
        from: 'bsleung@ucdavis.edu',
        to: 'iet-request@ucdavis.edu',
        subject: 'Accept Notification For Fetch Request',
        text: 'Upon completion of the fetch request(s) for the inputted CSV file, no errors were found.'
    };
    transporter.sendMail(mail);
    return;
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});