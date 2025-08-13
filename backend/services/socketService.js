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
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    },
    pingInterval: 25000, // send ping every 25 seconds
    pingTimeout: 60000, // disconnect if no pong within 60 seconds
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

        // Notify everyone about this user's online status
        io.emit("user_status", { userId, isOnline: true });

        // Send this user the online status of all other connected users
        for (const [onlineUserId, socketId] of onlineUsers.entries()) {
          if (onlineUserId !== userId) {
            socket.emit("user_status", {
              userId: onlineUserId,
              isOnline: true,
            });
          }
        }

        // --- NEW LOGIC: Mark undelivered messages as delivered and notify senders ---
        const undeliveredMessages = await Message.find({
          receiver: userId,
          messageStatus: "sent",
        });

        await Message.updateMany(
          { receiver: userId, messageStatus: "sent" },
          { $set: { messageStatus: "delivered" } }
        );

        undeliveredMessages.forEach((msg) => {
          const senderSocketId = onlineUsers.get(msg.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_status_update", {
              messageId: msg._id,
              messageStatus: "delivered",
            });
          }
        });
        // --- END NEW LOGIC ---
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
          io.to(receiverSocketId).emit("receive_message", messageData);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("message_error", {
          error: "Failed to send message",
        });
      }
    });

    //update message as delivered when received
    socket.on("message_delivered", async (messageId, senderId) => {
      try {
        // Update message status in the database
        const message = await Message.findById(messageId);
        if (!message) {
          console.error("Message not found for delivery update:", messageId);
          return;
        }

        // Only update if current status is "sent"
        if (message.messageStatus === "sent") {
          message.messageStatus = "delivered";
          await message.save();

          // Notify sender about the delivered status
          const senderSocketId = onlineUsers.get(senderId);
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "delivered",
            });
          }
        }
      } catch (error) {
        console.error("Error marking message as delivered:", error);
      }
    });

    //update message as read and notify sender
    socket.on("message_read", async (messageIds, senderId) => {
      try {
        // Update message status in the database
        await Message.updateMany(
          { _id: { $in: messageIds }, sender: senderId },
          { $set: { messageStatus: "read" } }
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
      async ({ messageId, emoji, userId: reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) {
            console.error("Message not found for reaction:", messageId);
            return;
          }

          // Ensure reactions array exists
          if (!message.reactions) {
            message.reactions = [];
          }

          const existingIndex = message.reactions.findIndex(
            (reaction) => reaction.user.toString() === reactionUserId
          );
          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              // Remove reaction if same emoji is clicked again
              message.reactions.splice(existingIndex, 1);
            } else {
              // Update the emoji if it's different
              message.reactions[existingIndex].emoji = emoji;
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

        // Notify all users that this user is now offline
        io.emit("user_status", { userId, isOnline: false });

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
