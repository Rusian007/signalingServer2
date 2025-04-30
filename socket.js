const { Server } = require("socket.io");
let IO;
const admin = require('firebase-admin');
const { validationResult } = require('express-validator');

// Initialize Firebase Admin SDK
//const serviceAccount = require('./firebase/firebase-admin.json');
const serviceAccount = require('/etc/secrets/firebase-admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports.initIO = (httpServer) => {
  IO = new Server(httpServer);
  const connectedUsers = [];

  IO.use((socket, next) => {
    if (socket.handshake.query) {
      let callerId = socket.handshake.query.callerId;
      socket.user = callerId;
      next();
    }
  });

  IO.on("connection", (socket) => {
    console.log(socket.user, "Connected");
    socket.join(socket.user);
    connectedUsers.push(socket.user);

    socket.emit("allUsers", connectedUsers);
   //IO.emit("allUsers", connectedUsers);


    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.user, "Reason: ", reason);
      connectedUsers.splice(connectedUsers.indexOf(socket.user), 1);
      socket.emit("allUsers", connectedUsers);
    });

    socket.on("refresh", (data) => {
      console.log("refreshing ...");
      socket.emit("allUsers", connectedUsers);
    });

    socket.on("call", (data) => {
      let calleeId = data.calleeId;
      let isAlert = data.isAlert;
      let rtcMessage = data.rtcMessage;
      let isVideomode = data.isVideomode;
      let aliasName = data.aliasName || null;

      setTimeout(() => {
        socket.to(calleeId).emit("newCall", {
          callerId: socket.user,
          rtcMessage: rtcMessage,
          isVideomode: isVideomode,
          aliasName: aliasName,
          isAlert: isAlert
        });
      }, 100);
    });

    socket.on("answerCall", (data) => {
      let callerId = data.callerId;
      let rtcMessage = data.rtcMessage;
      let aliasName = data.aliasName || null;

      console.log(data, "answerCall");
      socket.to(callerId).emit("callAnswered", {
        callee: socket.user,
        rtcMessage: rtcMessage,
        aliasName: aliasName
      });
    });

    socket.on("endCall", (data) => {
      let callerId = data.callerId;
      let rtcMessage = data.callEnd;
      console.log(callerId);
      socket.to(callerId).emit("callEnd", {
        callee: socket.user,
        rtcMessage: rtcMessage,
      });
    });

    socket.on("ICEcandidate", (data) => {
      //  console.log("ICEcandidate data.calleeId", data.calleeId);
      let calleeId = data.calleeId;
      let rtcMessage = data.rtcMessage;
      console.log("Ice emit from", socket.user);
      console.log("Ice emit to", calleeId);

      setTimeout(() => {
        socket.to(calleeId).emit("ICEcandidate", {
          sender: socket.user,
          rtcMessage: rtcMessage,
        });
      }, 100);
    });

  });
};

module.exports.sendNotification = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, calleeId, callerId, title, isVideomode, body, isALert, aliasName } = req.body;
  const message = {
    // notification: {
    //   title,
    //   body
    // },
    data: {
      calleeId: String(calleeId),
      callerId: String(callerId),
     // rtcMessage: String(rtcMessage),
      isVideomode: isVideomode ? 'true' : 'false',
      isAlert: String(isALert),
     // email: String(email || ""),
      aliasName: String(aliasName)
    },
  
    token: token,
    android: {
      priority: 'high',
      notification: {
        channelId: 'high-priority',
        icon: 'ic_notification'
      }
    }

  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {

    console.log('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification - ' + error.message });
  }
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
