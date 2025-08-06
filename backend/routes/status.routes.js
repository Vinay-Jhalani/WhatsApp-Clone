import express, { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";
import statusController from "../controllers/statusController.js";

const statusRouter = express.Router();

statusRouter.post(
  "/",
  isAuthenticated,
  multerMiddleware,
  statusController.createStatus
);
statusRouter.get("/", isAuthenticated, statusController.getStatus);
statusRouter.put(
  "/:statusId/view",
  isAuthenticated,
  statusController.viewStatus
);
statusRouter.delete(
  "/:statusId",
  isAuthenticated,
  statusController.deleteStatus
);
statusRouter.put(
  "/:statusId/like",
  isAuthenticated,
  statusController.likeStatus
);

export default statusRouter;
