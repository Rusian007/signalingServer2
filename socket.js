const { Server } = require("socket.io");
let IO;

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
      let rtcMessage = data.rtcMessage;
      let isVideomode = data.isVideomode;
      let aliasName = data.aliasName || null;

      console.log(data, "Call");      
      socket.to(calleeId).emit("newCall", {
        callerId: socket.user,
        rtcMessage: rtcMessage,
        isVideomode: isVideomode,
        aliasName: aliasName
      });
    });

    socket.on("answerCall", (data) => {
      let callerId = data.callerId;
      let rtcMessage = data.rtcMessage;
      let aliasName = data.aliasName || null;

      console.log(data, "answerCall" );
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
      console.log("socket.user emit from", socket.user);
      console.log("socket user emit to", calleeId);
      socket.to(calleeId).emit("ICEcandidate", {
        sender: socket.user,
        rtcMessage: rtcMessage,
      });
    });
  });


};

module.exports.getIO = () => {
  if (!IO) {
    throw Error("IO not initilized.");
  } else {
    return IO;
  }
};
