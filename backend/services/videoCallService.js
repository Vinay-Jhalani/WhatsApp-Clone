const handleVideoService = (socket, io, onlineUsers) => {
  // initiate call
  socket.on(
    "initiate_call",
    async ({ callerId, receiverId, callType, callerInfo }) => {
      console.log(
        "📡 BACKEND: Received initiate_call from:",
        callerId,
        "to:",
        receiverId,
        "type:",
        callType
      );
      const receiverSocketId = onlineUsers.get(receiverId);
      if (receiverSocketId) {
        const callId = `${callerId}-${receiverId}-${Date.now()}`;
        console.log(
          "📱 BACKEND: Receiver is online, forwarding call_initiated to receiver socket:",
          receiverSocketId
        );
        io.to(receiverSocketId).emit("call_initiated", {
          callerId,
          callerName: callerInfo?.username,
          callerAvatar: callerInfo?.profilePicture,
          callId,
          callType,
        });
      } else {
        // Handle case where receiver is not online
        console.log(`🔴 BACKEND: Receiver ${receiverId} is not online`);
        socket.emit("call_failed", { reason: "user is offline" });
      }
    }
  );

  // Answer call
  socket.on("accept_call", ({ callerId, callId, receiverId }) => {
    console.log(
      "✅ BACKEND: Received accept_call from:",
      receiverId,
      "to caller:",
      callerId
    );
    const callerSocketId = onlineUsers.get(callerId);
    if (callerSocketId) {
      console.log(
        "📞 BACKEND: Forwarding call_accepted to caller socket:",
        callerSocketId
      );
      socket.to(callerSocketId).emit("call_accepted", {
        callId,
        callerName: receiverId?.username,
        callerAvatar: receiverId?.profilePicture,
      });
    } else {
      // Handle case where caller is not online
      console.log(`🔴 BACKEND: Caller ${callerId} is not online`);
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
    console.log(
      "🔵 BACKEND: Received webrtc_offer from caller to:",
      receiverId
    );
    console.log("🔵 BACKEND: Socket.userId:", socket.userId); // Debugging line
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      console.log(
        "🔵 BACKEND: Forwarding webrtc_offer to receiver socket:",
        receiverSocketId
      );
      socket.to(receiverSocketId).emit("webrtc_offer", {
        offer,
        senderId: socket.userId,
        callId,
      });
      console.log(`🔵 BACKEND: Offer forwarded to Receiver: ${receiverId}`);
    } else {
      console.log(`🔴 BACKEND: Receiver ${receiverId} is not online`);
    }
  });

  // WebRTC answer event
  socket.on("webrtc_answer", ({ answer, receiverId, callId }) => {
    console.log(
      "🟢 BACKEND: Received webrtc_answer from receiver to:",
      receiverId
    );
    console.log("🟢 BACKEND: Socket.userId:", socket.userId); // Debugging line
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      console.log(
        "🟢 BACKEND: Forwarding webrtc_answer to caller socket:",
        receiverSocketId
      );
      socket.to(receiverSocketId).emit("webrtc_answer", {
        answer,
        senderId: socket.userId,
        callId,
      });
      console.log(`🟢 BACKEND: Answer forwarded to Caller: ${receiverId}`);
    } else {
      console.log(`🔴 BACKEND: Caller ${receiverId} is not online`);
    }
  });

  // WebRTC ICE candidate event
  socket.on("webrtc_ice_candidate", ({ candidate, receiverId, callId }) => {
    console.log("🧊 BACKEND: Received ICE candidate for:", receiverId);
    console.log("🧊 BACKEND: Socket.userId:", socket.userId); // Debugging line
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      console.log(
        "🧊 BACKEND: Forwarding ICE candidate to socket:",
        receiverSocketId
      );
      socket.to(receiverSocketId).emit("webrtc_ice_candidate", {
        candidate,
        senderId: socket.userId,
        callId,
      });
    } else {
      console.log(
        `🔴 BACKEND: Receiver ${receiverId} not found for ICE candidate`
      );
    }
  });

  // media status change event
  socket.on("media_status_change", ({ type, enabled, receiverId }) => {
    console.log(
      `[MEDIA STATUS] Received from ${socket.userId}: ${type} -> ${enabled}`
    );
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      socket.to(receiverSocketId).emit("media_status_change", {
        type,
        enabled,
        senderId: socket.userId,
      });
      console.log(`[MEDIA STATUS] Forwarded to ${receiverId}`);
    }
  });
};

export default handleVideoService;
