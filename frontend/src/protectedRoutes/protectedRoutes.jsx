import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useUserStore from "../store/useUserStore";
import { checkUserAuth } from "../services/user.service";
import { FaSpinner } from "react-icons/fa";

export const ProtectedRoutes = ({ children }) => {
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  const { isAuthenticated, setUser, clearUser } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkUserAuth();
        if (response.isAuthenticated) {
          setUser(response.user);
        } else {
          clearUser();
        }
      } catch (error) {
        console.error(error.message || "Failed to check authentication");
        clearUser();
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setUser, clearUser]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <FaSpinner className="animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== "/user-login") {
    navigate("/user-login", { replace: true });
    return null;
  }

  // Return children for authenticated users or if on login page
  return children;
};
