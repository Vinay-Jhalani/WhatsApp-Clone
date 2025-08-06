import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    phonePrefix: {
      type: String,
    },
    username: {
      type: String,
      unique: true,
    },
    email: {
      type: String,
      lowercase: true,
      validate: {
        validator: function (v) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
        },
        message: "Invalid email address format",
      },
    },
    otp: { type: String },
    otpExpiry: { type: Date },
    profilePicture: { type: String },
    about: { type: String },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    agreed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
