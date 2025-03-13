const path = require('path');
const { createServer } = require('http');
const { sendNotification } = require('./src/notification');
const { body } = require('express-validator');
const express = require('express');
const { getIO, initIO } = require('./socket');

const app = express();
app.use(express.json());

app.use('/', express.static(path.join(__dirname, 'static')));

app.get('/', (req, res) => {
    res.send('Are you lost ? Get requests are not supported !');
});

app.post('/send-notification-single', [
    body('token').notEmpty().withMessage('FCM token is required'),
    body('calleeId').notEmpty().withMessage('calleeID required'),
    body('rtcMessage').notEmpty().withMessage('rtcMessage is required'),
    body('title').notEmpty().withMessage('A Title is required'),
], sendNotification);

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
