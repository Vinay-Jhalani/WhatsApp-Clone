import response from "../utils/responseHandler.js";
import jwt from "jsonwebtoken";

const isAuthenticated = (req, res, next) => {
  const token = req.cookies?.auth_token;
  if (!token) {
    return response(res, 401, "Unauthorized access");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return response(res, 401, "Session invalid or expired");
  }
};

export default isAuthenticated;
