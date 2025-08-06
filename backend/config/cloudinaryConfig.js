import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // ✅ Fixed: Use ES6 import instead of require

let isConfigured = false;

const configureCloudinary = () => {
  if (!isConfigured) {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "Cloudinary environment variables are required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
      );
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    isConfigured = true;
    console.log("Cloudinary configured successfully");
  }
  return cloudinary;
};

const multerMiddleware = multer({ dest: "uploads/" }).single("media");

// ✅ Fixed uploadFileToCloudinary function
const uploadFileToCloudinary = async (file) => {
  try {
    const cloudinaryInstance = configureCloudinary();

    // ✅ Determine resource type
    const isVideo = file.mimetype.startsWith("video");
    const options = {
      resource_type: isVideo ? "video" : "image",
      folder: "whatsapp-clone", // Optional: organize uploads in folders
    };

    // ✅ Fixed Promise syntax and logic
    return new Promise((resolve, reject) => {
      if (isVideo) {
        // Use upload_large for videos
        cloudinaryInstance.uploader.upload_large(
          file.path,
          options,
          (error, result) => {
            // Clean up local file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      } else {
        // Use regular upload for images
        cloudinaryInstance.uploader.upload(
          file.path,
          options,
          (error, result) => {
            // Clean up local file
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
      }
    });
  } catch (error) {
    // Clean up local file if configuration fails
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

// ✅ Alternative async/await version (cleaner)
const uploadFileToCloudinaryAsync = async (file) => {
  try {
    const cloudinaryInstance = configureCloudinary();

    const isVideo = file.mimetype.startsWith("video");
    const options = {
      resource_type: isVideo ? "video" : "image",
      folder: "whatsapp-clone",
    };

    let result;
    if (isVideo) {
      result = await cloudinaryInstance.uploader.upload_large(
        file.path,
        options
      );
    } else {
      result = await cloudinaryInstance.uploader.upload(file.path, options);
    }

    // Clean up local file after successful upload
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return result;
  } catch (error) {
    // Clean up local file if upload fails
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    throw error;
  }
};

export {
  multerMiddleware,
  uploadFileToCloudinary,
  uploadFileToCloudinaryAsync,
};
