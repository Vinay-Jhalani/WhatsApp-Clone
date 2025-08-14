const handleVideoService = (socket, io, onlineUsers) => {
  // initiate call
  socket.on(
    "initiate_call",
    async ({ callerId, receiverId, callType, callerInfo }) => {
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;
        io.to(receiverSocketId).emit("call_initiated", {
          callerId,
          callerName: callerInfo?.username,
          callerAvatar: callerInfo?.profilePicture,
          callId,
          callType,
        });
      } else {
        // Handle case where receiver is not online
        console.log(`server: Receiver ${receiverId} is not online`);
        socket.emit("call_failed", { reason: "user is offline" });
      }
    }
  );

  // Answer call
  socket.on("accept_call", ({ callerId, callId, receiverId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      socket.to(callerSocketId).emit("call_accepted", {
        callId,
        callerName: receiverId?.username,
        callerAvatar: receiverId?.profilePicture,
      });
    } else {
      // Handle case where caller is not online
      console.log(`server: Caller ${callerId} is not online`);
    }
  });

  // Reject call
  socket.on("reject_call", ({ callerId, callId }) => {
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      socket.to(callerSocketId).emit("call_rejected", {
        callId,
        reason: "User rejected the call",
      });
    }
  });

  // End call
  socket.on("end_call", ({ callId, participantId }) => {
    const participantSocketId = onlineUsers.get(participantId);
    if (participantSocketId) {
      socket.to(participantSocketId).emit("call_ended", {
        callId,
        reason: "Call ended by the other participant",
      });
    } else {
      // Handle case where participant is not online
      console.log(`server: Participant ${participantId} is not online`);
    }
  });

  // WebRTC signaling event
  socket.on("webrtc_offer", ({ offer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`server offer forwarded to Receiver: ${receiverId}`);
    } else {
      console.log(`server: Receiver ${receiverId} is not online`);
    }
  });

  // WebRTC answer event
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        receiverId: socket.userId,
        callId,
      });
      console.log(`server answer forwarded to Caller: ${receiverId}`);
    } else {
      console.log(`server: Caller ${receiverId} is not online`);
    }
  });

  // WebRTC ICE candidate event
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("webrtc_ice_candidate", {
        candidate,
        receiverId: socket.userId,
        callId,
      });
    } else {
      console.log(`server: Receiver ${receiverId} not found for ICE candidate`);
    }
  });
};

export default handleVideoService;
