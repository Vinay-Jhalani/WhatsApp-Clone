import { uploadFileToCloudinaryAsync } from "../config/cloudinaryConfig.js";
import Status from "../models/Status.model.js";
import response from "../utils/responseHandler.js";

const createStatus = async (req, res) => {
  try {
    const { content, contentType = "text" } = req.body;
    const userId = req.userId;
    const file = req.file;
    if (!content && !file) {
      return response(res, 400, "Content is missing");
    }

    let mediaUrl = null;

    if (file) {
      const uploadFile = await uploadFileToCloudinaryAsync(file);
      if (!uploadFile?.secure_url) {
        return response(res, 500, "Media upload failed");
      }
      mediaUrl = uploadFile.secure_url;
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

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType,
      expiresAt,
    });

    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate("user", "name profilePicture")
      .populate("viewers", "name profilePicture")
      .populate("likedBy", "name profilePicture");

    //emit socket event to notify status creation
    if (req.io && req.socketUserMap) {
      //broadcast to all connecting users except the creator
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("newStatus", populatedStatus);
        }
      }
    }

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error("Error creating status:", error);
    response(res, 500, "Internal server error");
  }
};

const getStatus = async (req, res) => {
  try {
    const userId = req.userId;
    const statuses = await Status.find({
      user: userId,
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "name profilePicture")
      .populate("viewers", "name profilePicture")
      .populate("likedBy", "name profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses retrieved successfully", statuses);
  } catch (error) {
    console.error("Error retrieving statuses:", error);
    response(res, 500, "Internal server error");
  }
};

const viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    const isOwner = status.user.toString() === userId.toString();
    const hasViewed = status.viewers.some(
      (viewerId) => viewerId.toString() === userId.toString()
    );

    // If not owner and hasn't viewed, add to viewers
    if (!isOwner && !hasViewed) {
      status.viewers.push(userId);
      await status.save();

      // Build query for updated status
      const updatedStatus = await Status.findById(status._id)
        .populate("user", "name profilePicture")
        .populate("viewers", "name profilePicture")
        .populate("likedBy", "name profilePicture");

      // 🎯 SOCKET NOTIFICATION - Only when someone NEW views the status
      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString()
        );
        if (statusOwnerSocketId) {
          const viewData = {
            statusId,
            viewerId: userId,
            totalViews: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          };
          req.io.to(statusOwnerSocketId).emit("statusViewed", viewData);
        }
      }

      return response(res, 200, "Status viewed successfully", updatedStatus);
    }

    // Build base query with basic population
    let query = Status.findById(status._id).populate(
      "user",
      "name profilePicture"
    );

    // If owner, include viewers and likedBy
    if (isOwner) {
      query = query
        .populate("viewers", "name profilePicture")
        .populate("likedBy", "name profilePicture");
    }

    const updatedStatus = await query;

    // Handle other cases without socket notification
    if (!isOwner && hasViewed) {
      return response(res, 200, "Status already viewed", updatedStatus);
    }

    // Owner case - no socket notification needed
    return response(res, 200, "Status data retrieved", updatedStatus);
  } catch (error) {
    console.error("Error viewing status:", error);
    return response(res, 500, "Internal server error");
  }
};

const likeStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.userId;

  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    const hasLiked = status.likedBy.some(
      (likedUserId) => likedUserId.toString() === userId.toString()
    );

    if (hasLiked) {
      // If already liked, remove like
      status.likedBy = status.likedBy.filter(
        (likedUserId) => likedUserId.toString() !== userId.toString()
      );
      await status.save();
      return response(res, 200, "Status unliked successfully", status);
    } else {
      // If not liked, add like
      status.likedBy.push(userId);
      await status.save();
      return response(res, 200, "Status liked successfully", status);
    }
  } catch (error) {
    console.error("Error liking status:", error);
    return response(res, 500, "Internal server error");
  }
};

const deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.userId;

    try {
      const status = await Status.findById(statusId);
      if (!status) {
        return response(res, 404, "Status not found");
      }

      if (status.user.toString() !== userId.toString()) {
        return response(res, 403, "Unauthorized");
      }

      await status.deleteOne();

      //Emit socket event to notify status deletion
      if (req.io && req.socketUserMap) {
        for (const [connectedUserId, socketId] of req.socketUserMap) {
          if (connectedUserId !== userId) {
            req.io.to(socketId).emit("statusDeleted", statusId);
          }
        }
      }

      return response(res, 200, "Status deleted successfully");
    } catch (error) {
      console.error("Error deleting status:", error);
      return response(res, 500, "Internal server error");
    }
  } catch (error) {
    console.error("Error in deleteStatus:", error);
    return response(res, 500, "Internal server error");
  }
};

export default {
  createStatus,
  getStatus,
  viewStatus,
  deleteStatus,
  likeStatus,
};
