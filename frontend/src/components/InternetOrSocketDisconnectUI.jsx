import React from "react";
import { FiRefreshCw, FiWifiOff } from "react-icons/fi";
import useThemeStore from "../store/useThemeStore";
import useUserStore from "../store/useUserStore";

const InternetOrSocketDisconnectUI = ({
  isDisconnected,
  isInternetDisconnected,
  onReconnect,
  isReconnecting,
}) => {
  const { theme } = useThemeStore();
  const isAuthenticated = useUserStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return null;
  if (!isDisconnected && !isInternetDisconnected) return null;

  let message = "";
  let icon = null;
  if (isInternetDisconnected) {
    message = "No internet connection. Please check your network.";
    icon = <FiWifiOff className="w-5 h-5 mr-2" />;
  } else if (isDisconnected) {
    message = "Connected to internet, but not to server.";
    icon = <FiWifiOff className="w-5 h-5 mr-2" />;
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000] animate-slideDown">
      <div
        className={`flex items-center px-4 py-3 rounded-2xl shadow-lg border border-white/10 backdrop-blur-md ${
          theme === "dark"
            ? "bg-white/80 text-gray-900"
            : "bg-black/50 text-white"
        }`}
        style={{ minWidth: "320px" }}
      >
        {icon}
        <span className="flex-1 text-sm font-medium leading-snug">
          {message}
        </span>

        {!isInternetDisconnected && (
          <button
            onClick={onReconnect}
            disabled={isReconnecting}
            className={`ml-3 flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold transition-all duration-200 shadow-md border border-white/30 
              ${
                isReconnecting
                  ? "bg-white/20 cursor-not-allowed"
                  : "bg-white text-black hover:bg-gray-200"
              }`}
          >
            {isReconnecting ? (
              <>
                <FiRefreshCw className="w-4 h-4 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <FiRefreshCw className="w-4 h-4" />
                Reconnect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default InternetOrSocketDisconnectUI;
