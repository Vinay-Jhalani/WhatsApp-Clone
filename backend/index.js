import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/dbConnect.js";
import authRouter from "./routes/auth.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import http from "http";
import initializeSocket from "./services/socketService.js";
import statusRouter from "./routes/status.routes.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

const server = http.createServer(app);

const io = initializeSocket(server);

//apply socket middleware before routes
app.use((req, res, next) => {
  req.io = io;
  req.socketUserMap = io.socketUserMap;
  next();
});

connectDB().then(() => {
  console.log("MongoDB connected successfully");
  server.listen(process.env.PORT || 5000, () => {
    console.log(`PORT ${process.env.PORT || 5000} is exposed to the world!`);
  });
});

app.get("/", (req, res) => {
  res.send("Welcome to the backend!");
});

app.use("/api/auth", authRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/status", statusRouter);
