const path = require('path');
const { createServer } = require('http');
//const {  } = require('./src/notification');
const { body } = require('express-validator');
const express = require('express');
const { getIO, initIO, sendNotification, sendNotificationIOS, sendCallEndSignal } = require('./socket');

const app = express();
app.use(express.json());

app.use('/', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invalid Request</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { background-color: #f8f9fa; }
                .error-container {
                    height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                .error-card {
                    max-width: 500px;
                    padding: 2rem;
                    border-radius: 10px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-card text-center bg-white">
                    <h1 class="text-danger">❌ Invalid Request</h1>
                    <p class="lead">GET method is not supported here.</p>
                    <p>Please don't do this manually.</p>
                </div>
            </div>
        </body>
        </html>
    `);
});

app.post('/send-notification-single', [
    body('token').notEmpty().withMessage('FCM token is required'),
    body('calleeId').notEmpty().withMessage('calleeID required'),
], sendNotification);

/*app.post('/send-notification-apn', [
    body('token').notEmpty().withMessage('APN token is required'),
    body('calleeId').notEmpty().withMessage('calleeID required'),
], sendNotificationIOS);*/

app.post('/send-callend-signal', [
    body('callerId').notEmpty().withMessage('callerID required'),
], sendCallEndSignal);

const httpServer = createServer(app);

let port = process.env.PORT || 3000;
let hostname = '127.0.0.1'//'192.168.0.191'; // Define your hostname

initIO(httpServer);
//httpServer.listen(process.env.PORT || port);
httpServer.listen(port, () => {
    console.log(`Server started on http://${hostname}:${port}`);
});

console.log("Server started hehe ....");
getIO();
