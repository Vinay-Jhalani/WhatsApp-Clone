import express, { Router } from "express";
import authController from "../controllers/authController.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

const authRouter = express.Router();

authRouter.post("/sendOtp", authController.sendOtp);
authRouter.post("/verifyOtp", authController.verifyOtp);

// protected routes (isAuthenticated)

authRouter.put(
  "/updateProfile",
  isAuthenticated,
  multerMiddleware,
  authController.updateProfile
);

authRouter.get("/logout", isAuthenticated, authController.logout);

authRouter.get("/checkAuth", isAuthenticated, authController.isSessionValid);

authRouter.get("/users", isAuthenticated, authController.getAllUsers);

export default authRouter;
