import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/dbConnect.js";

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

connectDB().then(() => {
  console.log("MongoDB connected successfully");
  app.listen(process.env.PORT || 5000, () => {
    console.log(`PORT ${process.env.PORT || 5000} is exposed to the world!`);
  });
});

app.get("/", (req, res) => {
  res.send("Welcome to the backend!");
});
