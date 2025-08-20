import React from "react";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/useThemeStore";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/useLayoutStore";
import { FaCog, FaWhatsapp } from "react-icons/fa";
import { motion } from "framer-motion";
import { MdRadioButtonChecked } from "react-icons/md";
import Avatar from "./Avatar";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth <= 768);
  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact, setSelectedContact } =
    useLayoutStore();

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  React.useEffect(() => {
    if (location.pathname === "/") setActiveTab("chats");
    else if (location.pathname.includes("/status")) setActiveTab("status");
    else if (location.pathname.includes("/settings")) setActiveTab("settings");
    else if (location.pathname.includes("/user-profile"))
      setActiveTab("profile");
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) return null;

  const desktopContent = (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "chats" && "bg-gray-300 shadow-sm p-2 rounded-full"
        } focus:outline-none`}
        onClick={() => setSelectedContact(null)}
      >
        <FaWhatsapp
          className={`h-6 w-6 ${
            activeTab === "chats"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-200"
              : "text-gray-800"
          }`}
        />
      </Link>

      <Link
        to="/status"
        className={`${isMobile ? " " : "mb-8"} ${
          activeTab === "status" && "bg-gray-300 shadow-sm p-2 rounded-full"
        } focus:outline-none`}
      >
        <MdRadioButtonChecked
          className={`h-6 w-6 ${
            activeTab === "status"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-200"
              : "text-gray-800"
          }`}
        />
      </Link>

      {!isMobile && <div className="flex-grow" />}

      <Link
        to="/user-profile"
        className={`${isMobile ? " " : "mb-8"} ${
          activeTab === "profile" && "bg-gray-300 shadow-sm p-2 rounded-full"
        } focus:outline-none`}
      >
        {user?.profilePicture ? (
          <img
            src={user.profilePicture}
            alt="Profile"
            className="h-6 w-6 rounded-full"
          />
        ) : (
          <Avatar
            name={user?.username || user?.email || "User"}
            size="w-8 h-8"
            textSize="text-xs"
          />
        )}
      </Link>

      <Link
        to="/settings"
        className={`${isMobile ? " " : "mb-8"} ${
          activeTab === "settings" && "bg-gray-300 shadow-sm p-2 rounded-full"
        } focus:outline-none`}
      >
        <FaCog
          className={`h-6 w-6 ${
            activeTab === "settings"
              ? theme === "dark"
                ? "text-gray-800"
                : ""
              : theme === "dark"
              ? "text-gray-200"
              : "text-gray-800"
          }`}
        />
      </Link>
    </>
  );

  const mobileContent = (
    <div className="w-full flex items-center justify-between px-3">
      <Link
        to="/"
        onClick={() => setSelectedContact(null)}
        className="flex-1 flex flex-col items-center justify-center gap-1 text-center"
        aria-label="Chats"
      >
        <div
          className={`p-2 rounded-full ${
            activeTab === "chats"
              ? "bg-green-500 text-white shadow-lg"
              : "text-gray-600"
          }`}
        >
          <FaWhatsapp className="h-5 w-5" />
        </div>
        <span className="text-[10px] leading-none">Chats</span>
      </Link>

      <Link
        to="/status"
        className="flex-1 flex flex-col items-center justify-center gap-1 text-center"
        aria-label="Status"
      >
        <div
          className={`p-2 rounded-full ${
            activeTab === "status"
              ? "bg-green-500 text-white shadow-lg"
              : "text-gray-600"
          }`}
        >
          <MdRadioButtonChecked className="h-5 w-5" />
        </div>
        <span className="text-[10px] leading-none">Status</span>
      </Link>

      <Link
        to="/user-profile"
        className="flex-1 flex flex-col items-center justify-center gap-1 text-center"
        aria-label="Profile"
      >
        <div
          className={`p-1 rounded-full ${
            activeTab === "profile" ? "ring-2 ring-green-400" : ""
          }`}
        >
          {user?.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <Avatar
              name={user?.username || user?.email || "User"}
              size="w-6 h-6"
              textSize="text-xs"
            />
          )}
        </div>
        <span className="text-[10px] leading-none">Me</span>
      </Link>

      <Link
        to="/settings"
        className="flex-1 flex flex-col items-center justify-center gap-1 text-center"
        aria-label="Settings"
      >
        <div
          className={`p-2 rounded-full ${
            activeTab === "settings"
              ? "bg-green-500 text-white shadow-lg"
              : "text-gray-600"
          }`}
        >
          <FaCog className="h-5 w-5" />
        </div>
        <span className="text-[10px] leading-none">Settings</span>
      </Link>
    </div>
  );

  if (!isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`w-16 h-screen border-r-2 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-600"
            : "bg-[rgb(239, 242, 243)] border-gray-300 "
        } bg-opacity-90 flex items-center py-4 flex-col justify-between shadow-lg`}
      >
        {desktopContent}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-x-0 bottom-4 flex justify-center pointer-events-none"
    >
      <div
        className={`w-[92%] max-w-lg rounded-3xl px-3 py-2 flex items-center justify-between pointer-events-auto shadow-2xl ${
          theme === "dark"
            ? "bg-gray-800/90"
            : "bg-white/80 backdrop-blur-sm border border-gray-200/90"
        }`}
      >
        {mobileContent}
      </div>
    </motion.div>
  );
};

export default Sidebar;
