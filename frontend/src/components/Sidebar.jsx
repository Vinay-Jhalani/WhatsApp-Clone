import React, { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { theme, toggleTheme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname.includes("/status")) {
      setActiveTab("status");
    } else if (location.pathname.includes("/settings")) {
      setActiveTab("settings");
    } else if (location.pathname.includes("/user-profile")) {
      setActiveTab("profile");
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null; // Hide sidebar on mobile when a contact is selected
  }

  const sidebarContent = (
    <>
      <Link
        to="/"
        className={`${isMobile ? "" : "mb-8"} ${
          activeTab === "chats" && "bg-gray-300 shadow-sm p-2 rounded-full"
        } focus:outline-none`}
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
            activeTab === "setting"
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`${
        isMobile
          ? "fixed bottom-0 left-0 right-0 h-16"
          : "w-16 h-screen border-r-2"
      }
        ${
          theme === "dark"
            ? "bg-gray-800 border-gray-600"
            : "bg-[rgb(239, 242, 243)] border-gray-300 "
        } bg-opacity-90 flex items-center py-4 shadow-lg
        
        ${isMobile ? "justify-row" : "flex-col justify-between"}
        `}
    >
      {sidebarContent}
    </motion.div>
  );
};

export default Sidebar;
