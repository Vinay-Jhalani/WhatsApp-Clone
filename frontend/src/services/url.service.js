import axios from "axios";

const apiUrl = `${import.meta.env.VITE_BACKEND_URL}/api`;

const axiosInstance = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
});

export default axiosInstance;
