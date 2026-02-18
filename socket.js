const { Server } = require("socket.io");
let IO = null;
const admin = require('firebase-admin');
const { validationResult } = require('express-validator');
var apn = require('apn');
const apnProvider = require("./src/apnProvider");
// Initialize Firebase Admin SDK
//const serviceAccount = require('./firebase/firebase-admin.json');
const serviceAccount = require('/etc/secrets/firebase-admin.json');
const { v4: uuidv4 } = require('uuid');
const connectedUsers = [];
const activeCalls = new Map();
// structure: activeCalls.set(userId, { partnerId })

const isUserBusy = (userId) => activeCalls.has(userId);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports.initIO = (httpServer) => {
  IO = new Server(httpServer, {
    pingInterval: 1000,
    pingTimeout: 2000,
  });

  IO.use((socket, next) => {
    if (socket.handshake.query) {
      let callerId = socket.handshake.query.callerId;
      socket.user = callerId;
      next();
    }
  });

  IO.on("connection", (socket) => {
    console.log(socket.user.substring(0, 12), "Connected");
    socket.join(socket.user);
    if (!connectedUsers.includes(socket.user)) {
      connectedUsers.push(socket.user);
    }

    // socket.emit("allUsers", connectedUsers);
    //IO.emit("allUsers", connectedUsers);

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.user.substring(0, 6), "Reason: ", reason);
      connectedUsers.splice(connectedUsers.indexOf(socket.user), 1);

      if (activeCalls.has(socket.user)) {
        const partner = activeCalls.get(socket.user).partnerId;
        activeCalls.delete(socket.user);
        activeCalls.delete(partner);
      }
    });

    socket.on("refresh", (data) => {
      const partnerId = data.myPartner;

      console.log("refreshing... Checking partner:", partnerId);

      const isOnline = connectedUsers.includes(partnerId);

      if (isOnline) {
        socket.emit("userFound", { userId: partnerId });
      } else {
        socket.emit("userNotFound", { userId: partnerId });
      }
    });

    socket.on("initialCall", (data) => {
      const {
        calleeId,
        audioCall,
        receiverAlias,
        senderAlias,
        calling_time,
      } = data;

      console.log("Initial call to ", calleeId);

      if (isUserBusy(socket.user) || isUserBusy(calleeId)) {
        console.log("Someone busy, no emit.");
        socket.emit("user-busy", {});
        return;
      }

      const user = connectedUsers.includes(calleeId);
      console.log("Callee online?", user);
      setTimeout(() => {
        socket.to(calleeId).emit("newInitialCall", {
          callerId: socket.user,
          audioCall: audioCall,
          receiverAlias: receiverAlias,
          senderAlias: senderAlias,
          calling_time
        });
      }, 1500);
    });

    socket.on("initialCallAnswered", (data) => {
      let callerId = data.callerId;
      socket.to(callerId).emit("callAnsweredInitial", {
        callee: socket.user
      });
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

      //   console.log(data, "answerCall");
      socket.to(callerId).emit("callAnswered", {
        callee: socket.user,
        rtcMessage: rtcMessage,
        aliasName: aliasName
      });
    });

    // this emmited when a caller is connected to a callee
    // the caller will emit this 
    // and send the person he is connected to
    // When caller confirms connection
    socket.on("connected-caller", (data) => {
      const partner = data.calleeId;
      if (isUserBusy(socket.user)) return;

      activeCalls.set(socket.user, {
        partnerId: partner,
      });

      console.log("Caller confirmed");
    });

    // this emmited when a callee is connected to a caller
    // the callee will emit this 
    // and send the caller he is talking to
    socket.on("connected-callee", (data) => {
      const partner = data.callerId;
      if (isUserBusy(socket.user)) return;

      activeCalls.set(socket.user, {
        partnerId: partner,
      });

      console.log("Callee confirmed");
    });

    socket.on("endCall", (data) => {
      let callerId = data.callerId;
      let rtcMessage = data.callEnd;
      activeCalls.delete(socket.user);
      activeCalls.delete(callerId);
      socket.to(callerId).emit("callEnd", {
        callee: socket.user,
        rtcMessage: rtcMessage,
      });
    });

    socket.on("ICEcandidate", (data) => {
      //  console.log("ICEcandidate data.calleeId", data.calleeId);
      let calleeId = data.calleeId;
      let rtcMessage = data.rtcMessage;
      //  console.log("Ice emit from", socket.user);
      //  console.log("Ice emit to", calleeId);

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

  const { token, calleeId, callerId, title, isVideomode, body, isALert, aliasName, calling_time } = req.body;

  if (isUserBusy(token)) {
    console.log("Skipping FCM because user busy");
    return res.json({ success: true, message: "Skipped as user is busy" });
  }

  const message = {
    notification: {
      title: "TalkShade",
      body: "Call incoming",
    },
    data: {
      calleeId: String(calleeId),
      callerId: String(callerId),
      // rtcMessage: String(rtcMessage),
      isVideomode: isVideomode ? 'true' : 'false',
      isAlert: String(isALert),
      calling_time: String(calling_time),
      // email: String(email || ""),
      aliasName: String(aliasName)
    },

    token: token,
    android: {
      priority: 'high',
      notification: {
        channelId: "high-priority"
      }
      // notification: {
      //   channelId: 'high-priority',
      //   icon: 'ic_notification'
      // }
    },
    // apns: {
    //   payload: {
    //     aps: {
    //       alert: {
    //         title: "New Call",
    //         //   body: body
    //       },
    //       sound: 'default',
    //       badge: 1
    //     }
    //   },
    //   headers: {
    //     'apns-priority': '10' 
    //   }
    // }

  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    res.json({ success: true, message: 'Notification sent successfully', data: message });
  } catch (error) {

    console.log('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send notification - ' + error.message });
  }
};

module.exports.sendNotificationIOS = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
  const { token, calleeId, callerId, title, isVideomode, body, isALert, aliasName, calling_time } = req.body;
   if (isUserBusy(token)) {
    console.log("Skipping FCM because user busy");
    return res.json({ success: true, message: "Skipped as user is busy" });
  }
  const callUuid = uuidv4();

  const notification = new apn.Notification();
  notification.pushType = "voip";
  notification.topic = "com.incallproject.voip";
  notification.priority = 10;
  notification.payload = {
    aps: {
      "alert": {
        "title": "Incoming Call",
        "body": `${aliasName || "TalkShade"} is calling...`
      },
      "sound": "default",
      "content-available": 1,
    },
    callerId: callerId, // callee is for other user is this user's caller ID
    callerName: String(aliasName),
    uuid: callUuid,
    isALert,
    isVideo: isVideomode,
    calling_time: calling_time
  };
  notification.aps = {
    contentAvailable: 1,
    sound: "default",
    alert: {
      title: "Incoming Call",
      body: `${aliasName || "TalkShade"} is calling...`
    },
  };


    const result = await apnProvider.send(notification, token);
       console.log("APNs result", result);

    return res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      data: notification.payload
    });
  } catch (err) {
    console.error("APNs Error", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports.sendCallEndSignal = async (req, res) => {
  try {
    const callerId = req.body.callerId;

    if (!IO) {
      console.log("IO not initialized yet!");
      return res.status(500).json({ success: false });
    }

    console.log("Sending endCall to:", callerId);

    IO.to(callerId).emit("callEnd", {
      callee: "SERVER_SIGNAL",
      rtcMessage: "call_ended",
    });

    return res.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.log('Error sending message:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
