const path = require('path');
const { createServer } = require('http');

const express = require('express');
const { getIO, initIO } = require('./socket');

const app = express();

app.use('/', express.static(path.join(__dirname, 'static')));

const httpServer = createServer(app);

let port = process.env.PORT || 3500;


//const express = require("express");
// const { ExpressPeerServer } = require("peer");

// const app = express();

// app.get("/", (req, res, next) => res.send("Hello world!"));

// const http = require("http");

// const server = http.createServer(app);
// const peerServer = ExpressPeerServer(server, {
//   debug: true,
//   path: "/",
// });

// app.use("/peerjs", peerServer);

initIO(httpServer);
//httpServer.listen(process.env.PORT || port);
httpServer.listen(port)
console.log("Server started hehe ....");
getIO();