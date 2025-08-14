import React, { useEffect, useRef, useState, useCallback } from "react";
import useThemeStore from "../../store/useThemeStore";
import useUserStore from "../../store/useUserStore";
import { isToday, isYesterday, format, formatDate } from "date-fns";
import { useChatStore } from "../../store/useChatStore";
import { IoSend } from "react-icons/io5";
import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaPaperclip,
  FaSmile,
  FaTimes,
  FaVideo,
  FaWhatsapp,
} from "react-icons/fa";

import Avatar from "../../components/Avatar";
import MessageBubble from "./MessageBubble";
import EmojiPicker from "emoji-picker-react";
import SkeletonLoader from "../../components/SkeletonLoader";
import { getSocket } from "../../services/chat.service";
import CallManager from "../callsSection/CallManager";
import useCallingStore from "../../store/useCallingStore";
import { toast } from "sonner";

const isValidDate = (date) => {
  return date instanceof Date && !isNaN(date);
};

const ChatWindow = ({ selectedContact, setSelectedContact }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [emojisLoaded, setEmojisLoaded] = useState(false);
  const [preRenderedPicker, setPreRenderedPicker] = useState(null);

  // Animation and loading states
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [showContent, setShowContent] = useState(true);
  const [lastSelectedContactId, setLastSelectedContactId] = useState(null);

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const EmojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);
  const animationTimeoutRef = useRef(null);
  const isLoadingRef = useRef(false);
  const debounceTimeoutRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();
  const socket = getSocket();

  const {
    messages,
    sendMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    deleteMessage,
    addReaction,
    currentConversation,
    clearMessages,
    cleanupOldOptimisticMessages,
    set: setChatStore,
    markMessagesAsRead,
  } = useChatStore();
  // Mark messages as read when chat is opened and messages are loaded
  useEffect(() => {
    if (
      selectedContact?._id &&
      Array.isArray(messages) &&
      messages.length > 0
    ) {
      // Only mark as read if there are unread messages for the current user
      const hasUnread = messages.some(
        (msg) =>
          msg.messageStatus !== "read" &&
          msg.receiver?._id === user._id &&
          (msg.conversation === currentConversation ||
            (msg.isOptimistic &&
              msg.isNewConversation &&
              msg.sender._id === user._id &&
              msg.receiver._id === selectedContact._id))
      );
      if (hasUnread) {
        markMessagesAsRead();
      }
    }
  }, [
    selectedContact,
    messages,
    currentConversation,
    user._id,
    markMessagesAsRead,
  ]);

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Data preloading function
  const preloadChatData = useCallback(
    async (contact) => {
      if (!contact?._id || !conversations?.data?.length) {
        setShowContent(true);
        return;
      }

      // Prevent multiple concurrent loads
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsDataLoading(true);

      try {
        // Find conversation
        const conversation = conversations.data.find((conv) =>
          conv.participants.some(
            (participants) => participants._id === contact._id
          )
        );

        if (conversation) {
          await fetchMessages(conversation._id);
        }

        // Add a small delay to prevent flickering
        animationTimeoutRef.current = setTimeout(() => {
          isLoadingRef.current = false;
          setIsDataLoading(false);
          setShowContent(true);
        }, 150); // Reduced delay for smoother experience
      } catch (error) {
        console.error("Error preloading chat data:", error);
        isLoadingRef.current = false;
        setIsDataLoading(false);
        setShowContent(true);
      }
    },
    [conversations?.data, fetchMessages]
  );

  // Auto-load messages for selected contact on mount/reload (fixes reload issue)
  useEffect(() => {
    if (
      selectedContact?._id &&
      conversations?.data?.length > 0 &&
      lastSelectedContactId === selectedContact._id &&
      (!messages || messages.length === 0)
    ) {
      const conversationExists = conversations.data.some((conv) =>
        conv.participants.some((p) => p._id === selectedContact._id)
      );
      if (conversationExists) {
        setShowContent(false);
        preloadChatData(selectedContact);
      }
    }
    // No cleanup needed
    // eslint-disable-next-line
  }, [
    selectedContact,
    conversations,
    lastSelectedContactId,
    preloadChatData,
    messages,
  ]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Preload emoji data and pre-render the picker component
  useEffect(() => {
    // First preload the data

    fetch(
      "https://cdn.jsdelivr.net/npm/emoji-picker-react@4.13.2/dist/index.min.js"
    )
      .then(() => {
        // Then pre-render the component (this is hidden but already mounted in memory)
        setEmojisLoaded(true);
        setPreRenderedPicker(
          <EmojiPicker
            onEmojiClick={(emojiObject) => {
              setMessage((prev) => prev + emojiObject.emoji);
              setShowEmojiPicker(false);
            }}
            theme={theme}
            preload={true}
            lazyLoadEmojis={false}
            autoFocusSearch={false}
          />
        );
      })
      .catch((err) => console.error("Failed to preload emoji data:", err));
  }, [theme]);

  useEffect(() => {
    // Clear previous debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce the contact selection to prevent rapid switching issues
    debounceTimeoutRef.current = setTimeout(() => {
      // Only trigger loading if the contact actually changed
      if (selectedContact?._id !== lastSelectedContactId) {
        setLastSelectedContactId(selectedContact?._id || null);

        // Clean up old optimistic messages when switching contacts
        cleanupOldOptimisticMessages();

        if (selectedContact?._id && conversations?.data?.length > 0) {
          // Check if conversation exists for this contact
          const conversationExists = conversations.data.some((conv) =>
            conv.participants.some((p) => p._id === selectedContact._id)
          );
          if (conversationExists) {
            setShowContent(false); // Show skeleton
            preloadChatData(selectedContact);
          } else {
            // New conversation: clear messages and show content immediately
            clearMessages();
            setShowContent(true);
          }
        } else if (selectedContact?._id) {
          // No conversations at all, clear messages
          clearMessages();
          setShowContent(true);
        } else {
          setShowContent(true);
        }
      }
    }, 50); // 50ms debounce

    // Cleanup animation timeout on contact change
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    selectedContact,
    conversations,
    clearMessages,
    cleanupOldOptimisticMessages,
    preloadChatData,
    lastSelectedContactId,
  ]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Smart scroll: only scroll to bottom if user is near the bottom, or on initial load
  const scrollToBottom = (force = false) => {
    const container = messagesEndRef.current?.parentNode;
    if (!container) return;
    const threshold = 150; // px from bottom to consider as "near bottom"
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold;
    if (force || isNearBottom) {
      // For flex-col-reverse, scrollTop=0 shows the latest message
      container.scrollTop = 0;
    }
  };

  // On mount, always scroll to bottom
  useEffect(() => {
    scrollToBottom(true);
  }, []);

  // Scroll to bottom when selectedContact changes (e.g., navigating back to chat)
  useEffect(() => {
    if (selectedContact) {
      scrollToBottom(true);
    }
  }, [selectedContact]);

  // On messages update, only scroll if user is near bottom
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact._id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact._id);
      }, 2000);
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSendMessage = async () => {
    if (!selectedContact) return;
    setFilePreview(null);
    try {
      const formData = new FormData();
      formData.append("senderId", user._id);
      formData.append("receiverId", selectedContact._id);
      const status = online ? "delivered" : "sent";
      formData.append("messageStatus", status);
      if (message.trim()) {
        formData.append("content", message.trim());
      }
      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }
      if (!message.trim() && !selectedFile) {
        return;
      }

      setMessage(""); // Clear input instantly after send

      await sendMessage(formData);

      // After sending, update currentConversation if needed
      await fetchConversations();
      const updatedConversations = conversations?.data || [];
      let conversation = updatedConversations.find((conv) =>
        conv.participants.some((p) => p._id === selectedContact._id)
      );

      if (conversation) {
        // Set the current conversation if it's different or if it wasn't set
        if (conversation._id !== currentConversation) {
          setChatStore({ currentConversation: conversation._id });
          // Fetch messages for the conversation to ensure we have all messages
          await fetchMessages(conversation._id);
        }
      }

      //clear state
      setSelectedFile(null);
      setFilePreview(null);
      setShowFileMenu(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderDateSeparator = (date) => {
    if (!isValidDate(date)) return null;

    let dateString;
    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "yyyy-MM-dd");
    }
    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  //group message
  const groupMessages = Array.isArray(messages)
    ? messages
        .filter((msg) => {
          // Include messages for current conversation OR optimistic messages for new conversations with current contact
          return (
            msg.conversation === currentConversation ||
            (msg.isOptimistic &&
              msg.isNewConversation &&
              msg.sender._id === user._id &&
              msg.receiver._id === selectedContact._id &&
              msg.messageStatus !== "failed")
          ); // Don't show failed optimistic messages
        })
        .reduce((acc, message) => {
          const date = new Date(message.createdAt);
          if (isValidDate(date)) {
            const dateString = format(date, "yyyy-MM-dd");
            if (!acc[dateString]) {
              acc[dateString] = [];
            }
            acc[dateString].push(message);
          } else {
            console.warn("Invalid date in message:", message.createdAt);
          }
          return acc;
        }, {})
    : {};

  const handleReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
  };

  const handleVideoCall = () => {
    if (selectedContact && online) {
      const { initiateCall } = useCallingStore.getState();
      initiateCall({
        receiverId: selectedContact?._id,
        receiverName: selectedContact?.username,
        receiverAvatar: selectedContact?.profilePicture,
        callType: "video",
      });
    } else {
      toast.error("User is not online for a video call.");
    }
  };

  if (!selectedContact) {
    return (
      <>
        {" "}
        <div
          className={`flex-1 flex flex-col justify-center items-center h-screen ${
            theme === "dark" ? "bg-gray-900" : "bg-gray-100"
          }`}
        >
          <div className="text-center max-w-md mx-auto px-6">
            <svg
              viewBox="0 0 303 172"
              width="360"
              preserveAspectRatio="xMidYMid meet"
              fill="none"
            >
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M229.565 160.229C262.212 149.245 286.931 118.241 283.39 73.4194C278.009 5.31929 212.365 -11.5738 171.472 8.48673C115.998 35.6999 108.972 40.1612 69.2388 40.1612C39.645 40.1612 9.51317 54.4147 5.74669 92.952C3.01662 120.885 13.9985 145.267 54.6373 157.716C128.599 180.373 198.017 170.844 229.565 160.229Z"
                fill="#364147"
              ></path>
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M131.589 68.9422C131.593 68.9422 131.596 68.9422 131.599 68.9422C137.86 68.9422 142.935 63.6787 142.935 57.1859C142.935 50.6931 137.86 45.4297 131.599 45.4297C126.518 45.4297 122.218 48.8958 120.777 53.6723C120.022 53.4096 119.213 53.2672 118.373 53.2672C114.199 53.2672 110.815 56.7762 110.815 61.1047C110.815 65.4332 114.199 68.9422 118.373 68.9422C118.377 68.9422 118.381 68.9422 118.386 68.9422H131.589Z"
                fill="#F1F1F2"
                fill-opacity="0.38"
              ></path>
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M105.682 128.716C109.186 128.716 112.026 125.908 112.026 122.446C112.026 118.983 109.186 116.176 105.682 116.176C104.526 116.176 103.442 116.481 102.509 117.015L102.509 116.959C102.509 110.467 97.1831 105.203 90.6129 105.203C85.3224 105.203 80.8385 108.616 79.2925 113.335C78.6052 113.143 77.88 113.041 77.1304 113.041C72.7503 113.041 69.1995 116.55 69.1995 120.878C69.1995 125.207 72.7503 128.716 77.1304 128.716C77.1341 128.716 77.1379 128.716 77.1416 128.716H105.682L105.682 128.716Z"
                fill="#F1F1F2"
                fill-opacity="0.38"
              ></path>
              <rect
                x="0.445307"
                y="0.549558"
                width="50.5797"
                height="100.068"
                rx="7.5"
                transform="matrix(0.994522 0.104528 -0.103907 0.994587 10.5547 41.6171)"
                fill="#42CBA5"
                stroke="#316474"
              ></rect>
              <rect
                x="0.445307"
                y="0.549558"
                width="50.4027"
                height="99.7216"
                rx="7.5"
                transform="matrix(0.994522 0.104528 -0.103907 0.994587 10.9258 37.9564)"
                fill="#EEFAF6"
                stroke="#316474"
              ></rect>
              <path
                d="M57.1609 51.7354L48.5917 133.759C48.2761 136.78 45.5713 138.972 42.5503 138.654L9.58089 135.189C6.55997 134.871 4.36688 132.165 4.68251 129.144L13.2517 47.1204C13.5674 44.0992 16.2722 41.9075 19.2931 42.2251L24.5519 42.7778L47.0037 45.1376L52.2625 45.6903C55.2835 46.0078 57.4765 48.7143 57.1609 51.7354Z"
                fill="#DFF3ED"
                stroke="#316474"
              ></path>
              <path
                d="M26.2009 102.937C27.0633 103.019 27.9323 103.119 28.8023 103.21C29.0402 101.032 29.2706 98.8437 29.4916 96.6638L26.8817 96.39C26.6438 98.5681 26.4049 100.755 26.2009 102.937ZM23.4704 93.3294L25.7392 91.4955L27.5774 93.7603L28.7118 92.8434L26.8736 90.5775L29.1434 88.7438L28.2248 87.6114L25.955 89.4452L24.1179 87.1806L22.9824 88.0974L24.8207 90.3621L22.5508 92.197L23.4704 93.3294ZM22.6545 98.6148C22.5261 99.9153 22.3893 101.215 22.244 102.514C23.1206 102.623 23.9924 102.697 24.8699 102.798C25.0164 101.488 25.1451 100.184 25.2831 98.8734C24.4047 98.7813 23.5298 98.6551 22.6545 98.6148ZM39.502 89.7779C38.9965 94.579 38.4833 99.3707 37.9862 104.174C38.8656 104.257 39.7337 104.366 40.614 104.441C41.1101 99.6473 41.6138 94.8633 42.1271 90.0705C41.2625 89.9282 40.3796 89.8786 39.502 89.7779ZM35.2378 92.4459C34.8492 96.2179 34.4351 99.9873 34.0551 103.76C34.925 103.851 35.7959 103.934 36.6564 104.033C37.1028 100.121 37.482 96.1922 37.9113 92.2783C37.0562 92.1284 36.18 92.0966 35.3221 91.9722C35.2812 92.1276 35.253 92.286 35.2378 92.4459ZM31.1061 94.1821C31.0635 94.341 31.0456 94.511 31.0286 94.6726C30.7324 97.5678 30.4115 100.452 30.1238 103.348L32.7336 103.622C32.8582 102.602 32.9479 101.587 33.0639 100.567C33.2611 98.5305 33.5188 96.4921 33.6905 94.4522C32.8281 94.3712 31.9666 94.2811 31.1061 94.1821Z"
                fill="#316474"
              ></path>
              <path
                d="M17.892 48.4889C17.7988 49.3842 18.4576 50.1945 19.3597 50.2923C20.2665 50.3906 21.0855 49.7332 21.1792 48.8333C21.2724 47.938 20.6136 47.1277 19.7115 47.0299C18.8047 46.9316 17.9857 47.5889 17.892 48.4889Z"
                fill="white"
                stroke="#316474"
              ></path>
              <path
                d="M231.807 136.678L197.944 139.04C197.65 139.06 197.404 139.02 197.249 138.96C197.208 138.945 197.179 138.93 197.16 138.918L196.456 128.876C196.474 128.862 196.5 128.843 196.538 128.822C196.683 128.741 196.921 128.668 197.215 128.647L231.078 126.285C231.372 126.265 231.618 126.305 231.773 126.365C231.814 126.381 231.842 126.395 231.861 126.407L232.566 136.449C232.548 136.463 232.522 136.482 232.484 136.503C232.339 136.584 232.101 136.658 231.807 136.678Z"
                fill="white"
                stroke="#316474"
              ></path>
              <path
                d="M283.734 125.679L144.864 135.363C141.994 135.563 139.493 133.4 139.293 130.54L133.059 41.6349C132.858 38.7751 135.031 36.2858 137.903 36.0856L276.773 26.4008C279.647 26.2005 282.144 28.364 282.345 31.2238L288.578 120.129C288.779 122.989 286.607 125.478 283.734 125.679Z"
                fill="#EEFAF6"
              ></path>
              <path
                d="M144.864 135.363C141.994 135.563 139.493 133.4 139.293 130.54L133.059 41.6349C132.858 38.7751 135.031 36.2858 137.903 36.0856L276.773 26.4008C279.647 26.2004 282.144 28.364 282.345 31.2238L288.578 120.129C288.779 122.989 286.607 125.478 283.734 125.679"
                stroke="#316474"
              ></path>
              <path
                d="M278.565 121.405L148.68 130.463C146.256 130.632 144.174 128.861 144.012 126.55L138.343 45.695C138.181 43.3846 139.994 41.3414 142.419 41.1723L272.304 32.1142C274.731 31.945 276.81 33.7166 276.972 36.0271L282.641 116.882C282.803 119.193 280.992 121.236 278.565 121.405Z"
                fill="#DFF3ED"
                stroke="#316474"
              ></path>
              <path
                d="M230.198 129.97L298.691 125.193L299.111 131.189C299.166 131.97 299.013 132.667 298.748 133.161C298.478 133.661 298.137 133.887 297.825 133.909L132.794 145.418C132.482 145.44 132.113 145.263 131.777 144.805C131.445 144.353 131.196 143.684 131.141 142.903L130.721 136.907L199.215 132.131C199.476 132.921 199.867 133.614 200.357 134.129C200.929 134.729 201.665 135.115 202.482 135.058L227.371 133.322C228.188 133.265 228.862 132.782 229.345 132.108C229.758 131.531 230.05 130.79 230.198 129.97Z"
                fill="#42CBA5"
                stroke="#316474"
              ></path>
              <path
                d="M230.367 129.051L300.275 124.175L300.533 127.851C300.591 128.681 299.964 129.403 299.13 129.461L130.858 141.196C130.025 141.254 129.303 140.627 129.245 139.797L128.987 136.121L198.896 131.245C199.485 132.391 200.709 133.147 202.084 133.051L227.462 131.281C228.836 131.185 229.943 130.268 230.367 129.051Z"
                fill="#EEFAF6"
                stroke="#316474"
              ></path>
              <ellipse
                rx="15.9969"
                ry="15.9971"
                transform="matrix(0.997577 -0.0695704 0.0699429 0.997551 210.659 83.553)"
                fill="#42CBA5"
                stroke="#316474"
              ></ellipse>
              <path
                d="M208.184 87.1094L204.777 84.3593C204.777 84.359 204.776 84.3587 204.776 84.3583C203.957 83.6906 202.744 83.8012 202.061 84.6073C201.374 85.4191 201.486 86.6265 202.31 87.2997L202.312 87.3011L207.389 91.4116C207.389 91.4119 207.389 91.4121 207.389 91.4124C208.278 92.1372 209.611 91.9373 210.242 90.9795L218.283 78.77C218.868 77.8813 218.608 76.6968 217.71 76.127C216.817 75.5606 215.624 75.8109 215.043 76.6939L208.184 87.1094Z"
                fill="white"
                stroke="#316474"
              ></path>
            </svg>

            {/* Title and description */}
            <h1
              className={`text-3xl font-bold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              WhatsApp
            </h1>
            <p
              className={`text-lg mb-6 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Stay connected with friends and family through private messaging
            </p>

            {/* Features section */}
            <div
              className={`grid grid-cols-1 gap-4 mb-8 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <div
                className={`rounded-lg p-4 flex items-start ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                } shadow-sm`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-3 text-green-500 mt-0.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <div className="text-left">
                  <h3 className="font-semibold text-lg mb-1">
                    Start a conversation
                  </h3>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Select a contact from the sidebar to begin messaging
                  </p>
                </div>
              </div>
            </div>

            {/* Status indicator */}
            <div
              className={`flex items-center justify-center p-3 rounded-lg ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-300"
                  : "bg-green-50 text-gray-700"
              }`}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <p className="text-sm">End-to-end encrypted</p>
            </div>
          </div>
        </div>
        <CallManager socket={socket} />
      </>
    );
  }

  // Show skeleton loading during data preloading
  if (selectedContact && !showContent && isDataLoading) {
    return <SkeletonLoader theme={theme} />;
  }

  return (
    <>
      <div className="flex-1 h-screen w-full flex flex-col">
        <div
          className={`p-4 ${
            theme === "dark"
              ? "bg-[#303420] text-white"
              : "bg-[rgb(230,242,245)] text-gray-600"
          } flex items-center`}
        >
          <button
            className="mr-2 focus:outline-none"
            onClick={() => {
              clearMessages();
              cleanupOldOptimisticMessages();
              setSelectedContact(null);
              setShowContent(true);
              setIsDataLoading(false);
              setLastSelectedContactId(null);
              isLoadingRef.current = false;
            }}
          >
            <FaArrowLeft className="h-6 w-6" />
          </button>

          {selectedContact?.profilePicture ? (
            <img
              src={selectedContact?.profilePicture}
              alt={selectedContact?.username}
              className="w-10 h-10 rounded-full mr-3"
            />
          ) : (
            <Avatar
              name={selectedContact?.username || user?.email || "User"}
              size="w-10 h-10 "
              textSize="text-lg"
              className="ml-3"
            />
          )}

          <div className=" ml-3 flex-grow">
            <h2 className="font-semibold text-start">
              {selectedContact?.username || user?.email || "User"}
            </h2>
            {isTyping ? (
              <p className="text-sm text-gray-500">Typing...</p>
            ) : (
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {online
                  ? "Online"
                  : lastSeen
                  ? `Last seen: ${formatDate(new Date(lastSeen), "HH:mm")}`
                  : "Offline"}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-4">
            <button className="focus:outline-none" onClick={handleVideoCall}>
              <FaVideo
                className={`h-5 w-5 ${
                  online ? "text-green-500" : "text-gray-400"
                }`}
              />
            </button>
            <button className="focus:outline-none">
              <FaEllipsisV className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={`flex-1 p-4 overflow-y-auto ${
            theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
          } flex flex-col-reverse`}
        >
          {messages &&
          Array.isArray(messages) &&
          messages.filter((msg) => {
            // Show messages for current conversation OR optimistic messages for new conversations with current contact
            return (
              msg.conversation === currentConversation ||
              (msg.isOptimistic &&
                msg.isNewConversation &&
                msg.sender._id === user._id &&
                msg.receiver._id === selectedContact._id &&
                msg.messageStatus !== "failed")
            ); // Don't show failed optimistic messages
          }).length > 0 ? (
            [...Object.entries(groupMessages)]
              .sort((a, b) => new Date(b[0]) - new Date(a[0])) // latest date first
              .map(([date, msgs]) => (
                <React.Fragment key={date}>
                  {[...msgs]
                    .filter((msg) => {
                      // Show messages for current conversation OR optimistic messages for new conversations with current contact
                      return (
                        msg.conversation === currentConversation ||
                        (msg.isOptimistic &&
                          msg.isNewConversation &&
                          msg.sender._id === user._id &&
                          msg.receiver._id === selectedContact._id &&
                          msg.messageStatus !== "failed")
                      ); // Don't show failed optimistic messages
                    })
                    .sort(
                      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
                    ) // latest message first
                    .map((msg) => (
                      <MessageBubble
                        key={msg._id || msg.tempId}
                        message={msg}
                        theme={theme}
                        currentUser={user}
                        onReact={handleReaction}
                        deleteMessage={deleteMessage}
                        preRenderedPicker={preRenderedPicker}
                        emojisLoaded={emojisLoaded}
                      />
                    ))}
                  {renderDateSeparator(new Date(date))}
                </React.Fragment>
              ))
          ) : (
            <div className="flex flex-1 items-center justify-center text-gray-400 select-none">
              No messages yet.
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {filePreview && (
          <div className="relative p-2">
            <img
              src={filePreview}
              alt="File preview"
              className="w-80 object-cover rounded shadow-lg mx-auto"
            />
            <button
              onClick={() => {
                setSelectedFile(null);
                setFilePreview(null);
              }}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={`p-4 ${theme === "dark" ? "bg-[#303430]" : "bg-white"} ${
            isMobile ? "pb-6" : ""
          } flex items-center space-x-2 relative`}
        >
          {/* Hidden div to preload and keep the emoji picker in DOM but not visible */}
          <div className="hidden">
            {emojisLoaded && (
              <EmojiPicker
                onEmojiClick={() => {}}
                theme={theme}
                preload={true}
                lazyLoadEmojis={false}
                autoFocusSearch={false}
              />
            )}
          </div>

          <button
            className="focus:outline-none"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <FaSmile
              className={`h-6 w-6 ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            />
          </button>
          {showEmojiPicker && (
            <div
              ref={EmojiPickerRef}
              className="absolute bottom-16 left-0 z-50"
            >
              {emojisLoaded ? (
                preRenderedPicker || (
                  <EmojiPicker
                    onEmojiClick={(emojiObject) => {
                      setMessage((prev) => prev + emojiObject.emoji);
                      setShowEmojiPicker(false);
                    }}
                    theme={theme}
                    preload={true}
                    lazyLoadEmojis={false}
                    autoFocusSearch={false}
                  />
                )
              ) : (
                <div
                  className={`p-4 rounded shadow-lg ${
                    theme === "dark"
                      ? "bg-gray-700 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  Loading emojis...
                </div>
              )}
            </div>
          )}
          <div className="relative">
            <button
              className="focus:outline-none"
              onClick={() => setShowFileMenu(!showFileMenu)}
            >
              <FaPaperclip
                className={`h-6 w-6 mt-2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
            </button>

            {showFileMenu && (
              <div
                className={`absolute bottom-full left-0 mb-2 ${
                  theme === "dark" ? "bg-gray-700" : "bg-white"
                } rounded shadow-lg`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*,video/*"
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 ${
                    theme === "dark"
                      ? "hover:text-gray-500"
                      : "hover:text-gray-100"
                  }`}
                >
                  <FaImage className="h-5 w-5" /> Image/Video
                </button>
                <button
                  onClick={() => fileInputRef.current.click()}
                  className={`flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 ${
                    theme === "dark"
                      ? "hover:text-gray-500"
                      : "hover:text-gray-100"
                  }`}
                >
                  <FaFile className="h-5 w-5" /> Documents
                </button>
              </div>
            )}
          </div>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className={`flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 ${
              theme === "dark"
                ? "bg-gray-700 text-white border-gray-600"
                : "bg-white text-black border-gray-300"
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            className={` p-2 border-2 rounded-md text-white ${
              theme === "dark" ? "bg-green-600" : "bg-green-500"
            } hover:bg-green-700 focus:outline-none`}
          >
            <IoSend size={15} />
          </button>
        </div>
      </div>
      <CallManager socket={socket} />
    </>
  );
};

export default ChatWindow;
