import User from "../models/User.model.js";
import otpGeneration from "../utils/otpGeneration.js";
import response from "../utils/responseHandler.js";
import otpSendToWhatsApp from "../services/whatsappService.js";
import generateToken from "../utils/generateToken.js";
import sendOtpToEmail from "../services/emailService.js";
import { uploadFileToCloudinaryAsync } from "../config/cloudinaryConfig.js";
import Conversation from "../models/Conversation.model.js";

const sendOtp = async (req, res) => {
  const { phoneNumber, phonePrefix, email } = req.body;
  const otp = otpGeneration();
  const expiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({ email });
        await user.save(); // Save the new user first
      }
      user.otp = otp;
      user.otpExpiry = expiry;

      await user.save();

      try {
        await sendOtpToEmail(email, otp);
      } catch (otpError) {
        console.error("Failed to send OTP");
        return response(res, 500, otpError.message);
      }

      return response(res, 200, "Otp sent to your email", { email });
    } else {
      if (!phoneNumber) {
        return response(res, 400, "Phone number is required");
      }
      if (!phonePrefix) {
        return response(res, 400, "Country code is required");
      }
      const fullPhoneNumber = `${phonePrefix}${phoneNumber}`;
      user = await User.findOne({ phoneNumber, phonePrefix });
      if (!user) {
        user = new User({ phoneNumber, phonePrefix });
      }
      user.otp = otp;
      user.otpExpiry = expiry;
      await user.save();

      try {
        await otpSendToWhatsApp(Number(phonePrefix), Number(phoneNumber), otp);
      } catch (otpError) {
        console.error("Failed to send OTP:", otpError.message);
        return response(res, 500, otpError.message);
      }
      return response(res, 200, "OTP sent on your WhatsApp", {
        fullPhoneNumber,
      });
    }
  } catch (error) {
    console.error("Error in sendOtp:", error);
    return response(res, 500, "Internal server error");
  }
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, phonePrefix, email, otp } = req.body;

  try {
    if (!otp) {
      return response(res, 400, "OTP is required");
    }

    let user;

    if (phoneNumber && phonePrefix) {
      user = await User.findOne({ phoneNumber, phonePrefix });

      if (!user) {
        return response(res, 404, "User not found");
      }
    } else if (email) {
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        return response(res, 400, "Invalid email address");
      }

      user = await User.findOne({ email });

      if (!user) {
        return response(res, 404, "User not found");
      }
    } else if (!phonePrefix) {
      return response(res, 400, "Country code is required");
    } else if (!phoneNumber) {
      return response(res, 400, "Phone number is required");
    } else if (!email) {
      return response(res, 400, "Email is required");
    } else {
      return response(
        res,
        400,
        "Either email or phone number & country code is required"
      );
    }

    if (
      !user.otp ||
      String(user.otp) !== String(otp) ||
      user.otpExpiry < new Date()
    ) {
      return response(res, 400, "Invalid or expired OTP");
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = generateToken(user._id);
    res.cookie("auth_token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365,
    });

    response(res, 200, "OTP verified successfully", { token, user });
  } catch (error) {
    console.error("Error in OTP verification:", error);
    return response(res, 500, "Internal server error");
  }
};

const updateProfile = async (req, res) => {
  const { username, about, agreed } = req.body;
  const userId = req.userId;
  console.log(userId, username, about, agreed);
  try {
    const user = await User.findById(userId);
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinaryAsync(file);
      user.profilePicture = uploadResult.secure_url;
    }
    if (username) {
      user.username = username;
    }
    if (agreed) {
      user.agreed = agreed;
    }
    if (about) {
      user.about = about;
    }
    await user.save();
    response(res, 200, "Profile updated successfully", user);
  } catch (error) {
    console.error("Error updating profile:", error);
    response(res, 500, "Internal server error");
  }
};

const isSessionValid = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return response(res, 401, "Unauthorized");
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }
    response(res, 200, "user found", { user });
  } catch (error) {
    console.error("Error validating session:", error);
    response(res, 500, "Internal server error");
  }
};

const logout = (req, res) => {
  try {
    res.clearCookie("auth_token");
    response(res, 200, "Logged out successfully");
  } catch (error) {
    console.error("Error logging out:", error);
    response(res, 500, "Internal server error");
  }
};

const getAllUsers = async (req, res) => {
  const me = req.userId;
  try {
    const users = await User.find({ _id: { $ne: me } })
      .select(
        "username profilePicture lastSeen isOnline about phoneNumber phonePrefix email"
      )
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [user._id, me] },
        })
          .populate({
            path: "lastMessage",
            select: "content createdAt sender receiver contentType messageStatus",
          })
          .lean();
        return { ...user, conversation: conversation || null };
      })
    );
    response(res, 200, "Users fetched successfully", usersWithConversation);
  } catch (error) {
    console.error("Error fetching users:", error);
    response(res, 500, "Internal server error");
  }
};

export default {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  isSessionValid,
  getAllUsers,
};
