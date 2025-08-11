import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useThemeStore from "../../store/useThemeStore";
import useUserStore from "../../store/useUserStore";
import useLoginStore from "../../store/useLoginStore";
import { logoutUser, clearLoginStorage } from "../../services/user.service";
import { toast } from "sonner";
import Layout from "../../components/Layout";
import Avatar from "../../components/Avatar";

const Setting = () => {
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState();
  const navigate = useNavigate();
  const { theme } = useThemeStore();
  const { user, resetUserState } = useUserStore();
  const { resetLoginState } = useLoginStore();

  const toggleThemeDialog = async () => {
    setIsThemeDialogOpen(!isThemeDialogOpen);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();

      // Clear all authentication data
      resetUserState();
      resetLoginState();
      clearLoginStorage();

      // Show success message
      toast.success("Logged out successfully");

      // Navigate to login page after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 500);
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Logout failed. Please try again.");
    }
  };
  return (
    <Layout
      isThemeDialogOpen={isThemeDialogOpen}
      toggleThemeDialog={toggleThemeDialog}
    >
      <div
        className={`h-screen ${
          theme === "dark"
            ? "bg-[rgb(17,27,33)] text-white"
            : "bg-white text-black"
        }`}
      >
        <div
          className={`max-w-[400px] w-full mx-auto h-full overflow-y-auto ${
            theme === "dark" ? "border-gray-600" : "border-gray-200"
          }`}
        >
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Settings
            </h1>

            <div
              className={`mb-6 p-4 rounded-lg ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <Avatar
                    name={user?.username}
                    size="w-12 h-12"
                    textSize="text-lg"
                    className="shadow-md"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <p className="text-sm opacity-70">
                    Manage your personal information
                  </p>
                </div>
              </div>

              <div
                className={`p-3 rounded-md mb-2 ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                }`}
              >
                <p className="text-sm opacity-70">Username</p>
                <p className="font-medium">{user?.username || "Not set"}</p>
              </div>

              <div
                className={`p-3 rounded-md ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                }`}
              >
                {user?.email ? (
                  <p className="text-sm opacity-70">Email</p>
                ) : (
                  <p className="text-sm opacity-70">Phone Number</p>
                )}
                {user?.email ? (
                  <p className="font-medium">{user?.email}</p>
                ) : (
                  <p className="font-medium">
                    {user?.phonePrefix}-{user?.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`mb-6 p-4 rounded-lg ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-100"
              }`}
            >
              <h2 className="text-lg font-semibold mb-3 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
                Appearance
              </h2>
              <button
                onClick={toggleThemeDialog}
                className={`w-full py-3 px-4 rounded-md flex items-center justify-between ${
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-white hover:bg-gray-50"
                } transition duration-200`}
              >
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {theme === "dark" ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    )}
                  </svg>
                  <span>{theme === "dark" ? "Dark Theme" : "Light Theme"}</span>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <button
              onClick={handleLogout}
              className={`w-full mt-4 py-3 px-4 rounded-md flex items-center ${
                theme === "dark"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-500 hover:bg-red-600"
              } text-white transition duration-200`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </button>

            <p className="text-center text-xs opacity-50 mt-8">
              WhatsApp Clone v1.0.0
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Setting;
