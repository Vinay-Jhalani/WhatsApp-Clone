import response from "../utils/responseHandler.js";
import { uploadFileToCloudinaryAsync } from "../config/cloudinaryConfig.js";
import Conversation from "../models/Conversation.model.js";
import Message from "../models/Message.model.js";

const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    const participants = [senderId, receiverId].sort();

    //checking if conversation already exists
    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = new Conversation({ participants });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinaryAsync(file);
      if (!uploadFile?.secure_url) {
        response(res, 500, "Media upload failed");
      }
      imageOrVideoUrl = uploadFile.secure_url;
      if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const message = new Message({
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      content,
      contentType,
      imageOrVideoUrl,
      messageStatus,
    });

    await message.save();

    if (message.content) {
      conversation.lastMessage = message._id;
    }
    await conversation.save();

    const populatedMessage = await Message.findById(message._id).populate(
      "sender receiver",
      "username profilePicture"
    );

    //emit socket event to notify message sent
    if (req.io && req.socketUserMap) {
      const receiverSocket = req.socketUserMap.get(receiverId);
      if (receiverSocket) {
        req.io.to(receiverSocket).emit("receive_message", populatedMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 200, "Message sent successfully", populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    response(res, 500, "Internal server error");
  }
};

//get all conversations

const getConversations = async (req, res) => {
  const userId = req.userId;
  try {
    let conversations = await Conversation.find({ participants: userId })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 })
      .lean();

    return response(
      res,
      200,
      "Conversations fetched successfully",
      conversations
    );
  } catch (error) {
    console.error("Error fetching conversations:", error);
    response(res, 500, "Internal server error");
  }
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }
    if (!conversation.participants.includes(userId)) {
      return response(res, 403, "Unauthorized");
    }
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender receiver", "username profilePicture")
      .sort({ createdAt: 1 })
      .lean();

    // Find messages that need to be marked as read
    const unreadMessages = await Message.find({
      conversation: conversationId,
      receiver: userId,
      messageStatus: { $ne: "read" },
    });

    if (unreadMessages.length > 0) {
      // Update message status to read
      await Message.updateMany(
        {
          conversation: conversationId,
          receiver: userId,
          messageStatus: { $ne: "read" },
        },
        { $set: { messageStatus: "read" } }
      );

      // Notify senders that their messages were read
      if (req.io && req.socketUserMap) {
        // Group messages by sender to send notifications efficiently
        const messagesBySender = {};
        unreadMessages.forEach((message) => {
          const senderId = message.sender.toString();
          if (!messagesBySender[senderId]) {
            messagesBySender[senderId] = [];
          }
          messagesBySender[senderId].push(message._id);
        });

        // Send notifications to each sender
        for (const [senderId, messageIds] of Object.entries(messagesBySender)) {
          const senderSocketId = req.socketUserMap.get(senderId);
          if (senderSocketId) {
            messageIds.forEach((messageId) => {
              req.io.to(senderSocketId).emit("message_status_update", {
                messageId,
                messageStatus: "read",
              });
            });
          }
        }
      }
    }

    conversation.unreadCount = 0;
    await conversation.save();

    return response(res, 200, "Messages fetched successfully", messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    response(res, 500, "Internal server error");
  }
};

const markMessageAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.userId;

  try {
    // Find messages that need to be marked as read
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
      messageStatus: { $ne: "read" },
    });

    if (messages.length === 0) {
      return response(res, 200, "No messages to mark as read");
    }

    // Update message status to read
    await Message.updateMany(
      { _id: { $in: messageIds }, receiver: userId },
      { $set: { messageStatus: "read" } }
    );

    // Notify senders that their messages were read
    if (req.io && req.socketUserMap) {
      // Group messages by sender to send notifications efficiently
      const messagesBySender = {};
      messages.forEach((message) => {
        const senderId = message.sender.toString();
        if (!messagesBySender[senderId]) {
          messagesBySender[senderId] = [];
        }
        messagesBySender[senderId].push(message._id);
      });

      // Send notifications to each sender
      for (const [senderId, senderMessageIds] of Object.entries(
        messagesBySender
      )) {
        const senderSocketId = req.socketUserMap.get(senderId);
        if (senderSocketId) {
          senderMessageIds.forEach((messageId) => {
            req.io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      }
    }

    return response(res, 200, "Messages marked as read", messages);
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return response(res, 500, "Internal server error");
  }
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId) {
      return response(res, 403, "Unauthorized to delete this message");
    }
    await Message.deleteOne({ _id: messageId });
    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        const receiverSocketId = req.socketUserMap.get(
          message.receiver.toString()
        );
        if (receiverSocketId) {
          req.io.to(receiverSocketId).emit("message_deleted", messageId);
        }
      }
    }
    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error("Error deleting message:", error);
    return response(res, 500, "Internal server error");
  }
};

export default {
  sendMessage,
  getConversations,
  getMessages,
  markMessageAsRead,
  deleteMessage,
};
