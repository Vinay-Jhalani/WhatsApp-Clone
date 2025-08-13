import React, { useEffect, useState, useCallback } from "react";
import { disconnectSocket, initializeSocket } from "../services/chat.service";
import { useChatStore } from "../store/useChatStore";

const useSocketAndInternet = (user) => {
  const { setCurrentUser, initializeSocketListeners, cleanup } = useChatStore();
  const [isDisconnected, setIsDisconnected] = useState(false);
  const [isInternetDisconnected, setIsInternetDisconnected] = useState(
    !navigator.onLine
  );
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Socket connection/disconnection handling
  useEffect(() => {
    let socket;
    if (user?._id && !isInternetDisconnected) {
      socket = initializeSocket();
      if (socket) {
        setCurrentUser(user);
        initializeSocketListeners();
        socket.on("disconnect", () => {
          setIsDisconnected(true);
        });
        socket.on("connect", () => {
          setIsDisconnected(false);
        });
      }
    }
    return () => {
      cleanup();
      disconnectSocket();
      if (socket) {
        socket.off("disconnect");
        socket.off("connect");
      }
    };
  }, [
    user,
    setCurrentUser,
    initializeSocketListeners,
    cleanup,
    isInternetDisconnected,
  ]);

  // Track internet connection status
  useEffect(() => {
    const handleOnline = () => setIsInternetDisconnected(false);
    const handleOffline = () => setIsInternetDisconnected(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsInternetDisconnected(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Try to auto-reconnect on network online
  useEffect(() => {
    if (!isInternetDisconnected && isDisconnected && !isReconnecting) {
      handleReconnect();
    }
    // eslint-disable-next-line
  }, [isInternetDisconnected]);

  const handleReconnect = useCallback(() => {
    setIsReconnecting(true);
    disconnectSocket();
    setTimeout(() => {
      const socket = initializeSocket();
      if (socket) {
        setCurrentUser(user);
        initializeSocketListeners();
        socket.once("connect", () => {
          setIsDisconnected(false);
          setIsReconnecting(false);
        });
        socket.once("connect_error", () => {
          setIsReconnecting(false);
        });
      } else {
        setIsReconnecting(false);
      }
    }, 500);
  }, [user, setCurrentUser, initializeSocketListeners]);

  return {
    isDisconnected,
    isInternetDisconnected,
    isReconnecting,
    handleReconnect,
  };
};

const SocketAndInternetManager = ({ user, children }) => {
  const {
    isDisconnected,
    isInternetDisconnected,
    isReconnecting,
    handleReconnect,
  } = useSocketAndInternet(user);

  return children({
    isDisconnected,
    isInternetDisconnected,
    isReconnecting,
    handleReconnect,
  });
};

export default SocketAndInternetManager;
