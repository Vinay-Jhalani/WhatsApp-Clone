import { Server } from "socket.io";
import Message from "../models/Message.model.js";
import User from "../models/User.model.js";

// Storing online users in a map -> userId, socketId
const onlineUsers = new Map();

//Map to track typing status -> userId -> [conversation] : boolean
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST"],
    },
    pingTimeout: 60000, //Disconnect after 60 seconds of inactivity
  });

  // new connection established
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    let userId = null;

    //handle user connection and mark them online in db

    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId);
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });
        io.emit("user_status", { userId, isOnline: true });
      } catch (error) {
        console.error("Error in user_connected:", error);
      }
    });

    // Return online status of requested user
    socket.on("get_user_status", async (requestedUserId, callback) => {
      const isOnline = onlineUsers.has(requestedUserId);
      callback({
        userId: requestedUserId,
        isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    //forward message to receiver if online

    socket.on("send_message", async (messageData) => {
      try {
        const receiverSocketId = onlineUsers.get(messageData.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("message", messageData);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          error: "Failed to send message",
        });
      }
    });

    //update message as read and notify sender
    socket.on("message_read", async (messageIds, senderId) => {
      try {
        // Update message status in the database
        await Message.updateMany(
          { _id: { $in: messageIds }, sender: senderId },
          { $set: { status: "read" } }
        );

        // Notify sender about the read status
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    //handle typing start event and automatically stop typing after 5 seconds
    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (!typingUsers.has(userId)) typingUsers.set(userId, {});

      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;

      //clear any existing timeout
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }

      //automatically stop typing after 5 seconds
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket.to(receiverId).emit("user_typing", {
          userId,
          conversationId,
          isTyping: false,
        });
      }, 5000);

      //Notify receiver
      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: true,
      });
    });

    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;

      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;

        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
        }
      }

      socket.to(receiverId).emit("user_typing", {
        userId,
        conversationId,
        isTyping: false,
      });
    });

    //Add or update reaction on message
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId, reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;

          const existingIndex = message.reactions.findIndex(
            (reaction) => reaction.user.toString() === reactionUserId.toString()
          );
          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              // Remove reaction if same emoji is clicked again
              message.reactions.splice(existingIndex, 1);
            }
          } else {
            // Add new reaction
            message.reactions.push({ user: reactionUserId, emoji });
          }

          await message.save();

          const populatedMessage = await Message.findById(messageId)
            .populate("sender", "name profilePicture")
            .populate("receiver", "name profilePicture")
            .populate("reactions.user", "username");

          const reactionUpdated = {
            messageId,
            reactions: populatedMessage.reactions,
          };

          const senderSocket = onlineUsers.get(
            populatedMessage.sender?._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populatedMessage.receiver?._id.toString()
          );

          if (senderSocket)
            io.to(senderSocket).emit("reaction_updated", reactionUpdated);
          if (receiverSocket)
            io.to(receiverSocket).emit("reaction_updated", reactionUpdated);
        } catch (error) {
          console.error("Error adding reaction:", error);
        }
      }
    );

    // Handle disconnection
    const handleDisconnected = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);

        //clear all typing timeouts
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[key]);
            }
          });
          typingUsers.delete(userId);
        }

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });

        socket.leave(userId);
        console.log("User disconnected:", userId);
      } catch (error) {
        console.error("Error handling disconnection:", error);
      }
    };

    socket.on("disconnect", handleDisconnected);
  });

  //attach the online user map to the socket server for external user
  io.socketUserMap = onlineUsers;

  return io;
};

export default initializeSocket;
