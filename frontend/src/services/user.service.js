import axiosInstance from "./url.service";

export const sendOTP = async (phoneNumber, phonePrefix, email) => {
  try {
    const response = await axiosInstance.post(`/auth/sendOtp`, {
      phoneNumber,
      phonePrefix,
      email,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const verifyOTP = async (email, otp, phoneNumber, phonePrefix) => {
  try {
    const response = await axiosInstance.post(`/auth/verifyOtp`, {
      email,
      otp,
      phoneNumber,
      phonePrefix,
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const updateProfile = async (updatedData) => {
  try {
    const response = await axiosInstance.put(
      `/auth/updateProfile`,
      updatedData
    );
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const checkUserAuth = async () => {
  try {
    const response = await axiosInstance.get(`/auth/checkAuth`);
    if (response.data.status === "success") {
      return { isAuthenticated: true, user: response?.data?.data?.user };
    } else if (response.data.status === "error") {
      return { isAuthenticated: false };
    }
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const logoutUser = async () => {
  try {
    const response = await axiosInstance.get(`/auth/logout`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

export const getAllUsers = async () => {
  try {
    const response = await axiosInstance.get(`/auth/users`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error.message;
  }
};

// Clear login storage after successful authentication
export const clearLoginStorage = () => {
  try {
    localStorage.removeItem("login-storage");
    console.log("Login storage cleared successfully");
  } catch (error) {
    console.error("Failed to clear login storage:", error);
  }
};
