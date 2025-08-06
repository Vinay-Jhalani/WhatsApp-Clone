import express, { Router } from "express";
import authController from "../controllers/authController.js";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import { multerMiddleware } from "../config/cloudinaryConfig.js";

const authRouter = express.Router();

authRouter.post("/send-otp", authController.sendOtp);
authRouter.post("/verify-otp", authController.verifyOtp);

// protected routes (isAuthenticated)

authRouter.put(
  "/update-profile",
  isAuthenticated,
  multerMiddleware,
  authController.updateProfile
);

authRouter.get("/logout", isAuthenticated, authController.logout);

authRouter.get("/check-auth", isAuthenticated, authController.isSessionValid);

authRouter.get("/users", isAuthenticated, authController.getAllUsers);

export default authRouter;
