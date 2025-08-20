import axiosInstance from "./url.service";

// Create a new status
export const createStatus = async (statusData) => {
  try {
    const formData = new FormData();

    // Add text content if provided
    if (statusData.content?.trim()) {
      formData.append("content", statusData.content);
    }

    // Add background gradient for text statuses
    if (statusData.backgroundColor) {
      formData.append("backgroundColor", statusData.backgroundColor);
    }

    // Add file if provided
    if (statusData.file) {
      formData.append("media", statusData.file);
    }

    // Add caption for media statuses
    if (statusData.caption?.trim()) {
      formData.append("caption", statusData.caption);
    }

    const response = await axiosInstance.post("/status", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error creating status:", error);
    throw error;
  }
};

// Get all statuses
export const getAllStatuses = async () => {
  try {
    const response = await axiosInstance.get("/status");
    return response.data;
  } catch (error) {
    console.error("Error fetching statuses:", error);
    throw error;
  }
};

// View a status
export const viewStatus = async (statusId) => {
  try {
    const response = await axiosInstance.put(`/status/${statusId}/view`);
    return response.data;
  } catch (error) {
    console.error("Error viewing status:", error);
    throw error;
  }
};

// Delete a status
export const deleteStatus = async (statusId) => {
  try {
    const response = await axiosInstance.delete(`/status/${statusId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting status:", error);
    throw error;
  }
};

// Like/Unlike a status
export const likeStatus = async (statusId) => {
  try {
    const response = await axiosInstance.put(`/status/${statusId}/like`);
    return response.data;
  } catch (error) {
    console.error("Error liking status:", error);
    throw error;
  }
};
