import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import useThemeStore from "../store/useThemeStore";
import { AnimatePresence } from "framer-motion";
import { motion } from "framer-motion";
import SideBar from "./Sidebar";
import ChatWindow from "../pages/chatSection/ChatWindow";
import useLayoutStore from "../store/useLayoutStore";

const Layout = ({
  children,
  isThemeDialogOpen,
  toggleThemeDialog,
  isStatusPreviewOpen,
  statusPreviewContent,
}) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const activeTab = useLayoutStore((state) => state.activeTab);
  const setActiveTab = useLayoutStore((state) => state.setActiveTab);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-[#111b21] text-white" : "bg-gray-100 text-black"
      } flex relative`}
    >
      {!isMobile && <SideBar />}
      <div
        className={`flex-1 flex overflow-hidden ${isMobile ? "flex-col" : ""}`}
      >
        <AnimatePresence initial={true} mode="wait">
          {(!selectedContact || !isMobile) && (
            <motion.div
              key="chatlist"
              initial={{ x: isMobile ? "-100%" : 0 }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween" }}
              className={`w-full md:w-2/5 h-full ${isMobile ? "" : ""}`}
            >
              {children}
            </motion.div>
          )}
          {(selectedContact || !isMobile) && (
            // Only animate in ChatWindow when messages are loaded
            <>
              {selectedContact && isMobile && (
                <motion.div
                  key="chatWindow"
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "tween" }}
                  className={`w-full h-full absolute inset-0 flex items-center justify-center`}
                >
                  <ChatWindow
                    selectedContact={selectedContact}
                    setSelectedContact={setSelectedContact}
                    isMobile={isMobile}
                  />
                </motion.div>
              )}
              {!isMobile && (
                <div className="w-full h-full">
                  <ChatWindow
                    selectedContact={selectedContact}
                    setSelectedContact={setSelectedContact}
                    isMobile={isMobile}
                  />
                </div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
      {isMobile && <SideBar />}
      <AnimatePresence>
        {isThemeDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 2, 0.3, 1] }}
              className={`relative p-8 rounded-2xl shadow-2xl max-w-sm w-full backdrop-blur-lg 
                ${
                  theme === "dark"
                    ? "bg-[#202c33]/30 border border-gray-700 text-white"
                    : "bg-white/30 border border-gray-200 text-black"
                }
              `}
            >
              <h2 className="text-2xl font-bold mb-6 text-center">
                Choose a theme
              </h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222c33] transition">
                  <input
                    type="radio"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => toggleTheme("light")}
                    className="form-radio text-blue-600 focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-lg flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-yellow-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <circle cx="12" cy="12" r="5" />
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                    </svg>
                    Light
                  </span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#222c33] transition">
                  <input
                    type="radio"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => toggleTheme("dark")}
                    className="form-radio text-blue-600 focus:ring-2 focus:ring-blue-400"
                  />
                  <span className="text-lg flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-700 dark:text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
                    </svg>
                    Dark
                  </span>
                </label>
              </div>
              <button
                onClick={toggleThemeDialog}
                className="mt-8 py-2 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-lg shadow hover:scale-105 hover:from-blue-600 hover:to-blue-800 transition-all duration-200 w-full"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* status preview */}
      {isStatusPreviewOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          {statusPreviewContent}
        </div>
      )}
    </div>
  );
};

export default Layout;
