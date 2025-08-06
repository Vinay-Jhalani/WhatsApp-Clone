import express, { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import chatController from "../controllers/chatController.js";

const chatRoutes = express.Router();

// protected routes (isAuthenticated)
chatRoutes.post(
  "/send-message",
  isAuthenticated,
  multerMiddleware,
  chatController.sendMessage
);
chatRoutes.get(
  "/conversations",
  isAuthenticated,
  chatController.getConversations
);
chatRoutes.get(
  "/conversations/:conversationId/messages",
  isAuthenticated,
  chatController.getMessages
);
chatRoutes.put(
  "/messages/read",
  isAuthenticated,
  chatController.markMessageAsRead
);
chatRoutes.delete(
  "/messages/:messageId",
  isAuthenticated,
  chatController.deleteMessage
);

export default chatRoutes;
