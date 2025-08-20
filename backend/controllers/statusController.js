import { uploadFileToCloudinaryAsync } from "../config/cloudinaryConfig.js";
import Status from "../models/Status.model.js";
import response from "../utils/responseHandler.js";

const createStatus = async (req, res) => {
  try {
    const { content, backgroundColor, caption } = req.body;
    let contentType = "text";
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

    const statusData = {
      user: userId,
      content: mediaUrl || content,
      contentType,
      expiresAt,
    };

    // Add backgroundColor for text statuses
    if (contentType === "text" && backgroundColor) {
      statusData.backgroundColor = backgroundColor;
    }

    // Add caption for media statuses
    if ((contentType === "image" || contentType === "video") && caption) {
      statusData.caption = caption;
    }

    const status = new Status(statusData);

    await status.save();

    const populatedStatus = await Status.findById(status._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .populate("likedBy", "username profilePicture");

    //emit socket event to notify status creation
    if (req.io && req.socketUserMap) {
      console.log(
        "[DEBUG] Emitting new_status. socketUserMap:",
        Array.from(req.socketUserMap.entries())
      );
      //broadcast to all connecting users except the creator
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        console.log(
          `[DEBUG] Checking user ${connectedUserId} (socket ${socketId}) for new_status`
        );
        if (connectedUserId !== userId) {
          console.log(`[DEBUG] Emitting new_status to socket ${socketId}`);
          req.io.to(socketId).emit("new_status", populatedStatus);
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
    // Fetch ALL statuses from ALL users that haven't expired
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .populate("likedBy", "username profilePicture")
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
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture")
        .populate("likedBy", "username profilePicture");

      // 🎯 SOCKET NOTIFICATION - Only to status owner and viewer
      if (req.io && req.socketUserMap) {
        console.log(
          "[DEBUG] Emitting status_viewed. socketUserMap:",
          Array.from(req.socketUserMap.entries())
        );
        const statusOwnerSocketId = req.socketUserMap.get(
          status.user._id.toString()
        );
        const viewerSocketId = req.socketUserMap.get(userId.toString());
        const viewData = {
          statusId,
          viewerId: userId,
          totalViews: updatedStatus.viewers.length,
          viewers: updatedStatus.viewers,
        };
        if (statusOwnerSocketId) {
          console.log(
            `[DEBUG] Emitting status_viewed to socket ${statusOwnerSocketId}`
          );
          req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
        }
        if (viewerSocketId) {
          console.log(
            `[DEBUG] Emitting status_viewed to viewer socket ${viewerSocketId}`
          );
          req.io.to(viewerSocketId).emit("status_viewed", viewData);
        }
      }

      return response(res, 200, "Status viewed successfully", updatedStatus);
    }

    // Build base query with basic population
    let query = Status.findById(status._id).populate(
      "user",
      "username profilePicture"
    );

    // If owner, include viewers and likedBy
    if (isOwner) {
      query = query
        .populate("viewers", "username profilePicture")
        .populate("likedBy", "username profilePicture");
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

  console.log("[DEBUG] likeStatus called", { statusId, userId });
  try {
    const status = await Status.findById(statusId);
    console.log("[DEBUG] Status found:", status);
    if (!status) {
      console.log("[DEBUG] Status not found for id:", statusId);
      return response(res, 404, "Status not found");
    }

    const hasLiked = status.likedBy.some(
      (likedUserId) => likedUserId.toString() === userId.toString()
    );
    console.log("[DEBUG] hasLiked:", hasLiked);

    let populatedStatus;
    if (hasLiked) {
      // If already liked, remove like
      status.likedBy = status.likedBy.filter(
        (likedUserId) => likedUserId.toString() !== userId.toString()
      );
      await status.save();
      populatedStatus = await Status.findById(status._id)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture")
        .populate("likedBy", "username profilePicture");
      console.log("[DEBUG] Status unliked, populatedStatus:", populatedStatus);
      // Emit socket event for unliking status
      if (req.io && req.socketUserMap) {
        console.log(
          "[DEBUG] Emitting status_liked. socketUserMap:",
          Array.from(req.socketUserMap.entries())
        );
        for (const [connectedUserId, socketId] of req.socketUserMap) {
          console.log(
            `[DEBUG] Checking user ${connectedUserId} (socket ${socketId}) for status_liked`
          );
          if (connectedUserId !== userId) {
            console.log(`[DEBUG] Emitting status_liked to socket ${socketId}`);
            req.io.to(socketId).emit("status_liked", {
              statusId: status._id,
              likedBy: populatedStatus.likedBy,
            });
          }
        }
      }
      return response(res, 200, "Status unliked successfully", populatedStatus);
    } else {
      // If not liked, add like
      status.likedBy.push(userId);
      await status.save();
      populatedStatus = await Status.findById(status._id)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture")
        .populate("likedBy", "username profilePicture");
      console.log("[DEBUG] Status liked, populatedStatus:", populatedStatus);
      // Emit socket event for liking status
      if (req.io && req.socketUserMap) {
        console.log(
          "[DEBUG] Emitting status_liked. socketUserMap:",
          Array.from(req.socketUserMap.entries())
        );
        for (const [connectedUserId, socketId] of req.socketUserMap) {
          console.log(
            `[DEBUG] Checking user ${connectedUserId} (socket ${socketId}) for status_liked`
          );
          if (connectedUserId !== userId) {
            console.log(`[DEBUG] Emitting status_liked to socket ${socketId}`);
            req.io.to(socketId).emit("status_liked", {
              statusId: status._id,
              likedBy: populatedStatus.likedBy,
            });
          }
        }
      }
      return response(res, 200, "Status liked successfully", populatedStatus);
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

    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId.toString()) {
      return response(res, 403, "Unauthorized");
    }

    await status.deleteOne();

    // Emit socket event to notify status deletion
    if (req.io && req.socketUserMap) {
      console.log(
        "[DEBUG] Emitting status_deleted. socketUserMap:",
        Array.from(req.socketUserMap.entries())
      );
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        console.log(
          `[DEBUG] Checking user ${connectedUserId} (socket ${socketId}) for status_deleted`
        );
        if (connectedUserId !== userId) {
          console.log(`[DEBUG] Emitting status_deleted to socket ${socketId}`);
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }

    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error("Error deleting status:", error);
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
