import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUserStore from "../store/useUserStore";
import { checkUserAuth } from "../services/user.service";
import { TbLoader3 } from "react-icons/tb";

export const ProtectedRoutes = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  const { isAuthenticated, setUser, resetUserState } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkUserAuth();
        if (response.isAuthenticated) {
          setUser(response.user);
        } else {
          resetUserState();
          navigate("/user-login", { replace: true });
        }
      } catch (error) {
        console.error(error.message || "Failed to check authentication");
        resetUserState();
        navigate("/user-login", { replace: true });
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setUser, resetUserState, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TbLoader3 className="animate-spin text-7xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by useEffect
  }

  return children;
};

export const PublicRoutes = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  const { setUser, resetUserState } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await checkUserAuth();
        if (response.isAuthenticated) {
          setUser(response.user);
          navigate("/", { replace: true }); // Redirect to home if already authenticated
        } else {
          resetUserState();
        }
      } catch (error) {
        console.error(error.message || "Failed to check authentication");
        resetUserState();
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [setUser, resetUserState, navigate]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TbLoader3 className="animate-spin text-7xl text-green-300" />
      </div>
    );
  }

  // Show login page only if user is not authenticated
  return children;
};
