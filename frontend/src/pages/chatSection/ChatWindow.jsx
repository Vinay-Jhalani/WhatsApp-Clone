import React, { use, useEffect, useRef, useState } from "react";
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
  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const EmojiPickerRef = useRef(null);
  const fileInputRef = useRef(null);

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    messages,
    loading,
    sendMessage,
    receiveMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    cleanUp,
    deleteMessage,
    addReaction,
  } = useChatStore();

  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);

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
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((conv) =>
        conv.participants.some(
          (participants) => participants._id === selectedContact._id
        )
      );
      if (conversation) {
        fetchMessages(conversation._id);
      }
    }
  }, [selectedContact, conversations, fetchMessages]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

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
      await sendMessage(formData);

      //clear state
      setMessage("");
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
    ? messages.reduce((acc, message) => {
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

  if (!selectedContact) {
    return (
      <div
        className={`flex-1 flex flex-col justify-center items-center h-screen ${
          theme === "dark" ? "bg-gray-900" : "bg-gray-100"
        }`}
      >
        <div className="text-center max-w-md mx-auto px-6">
          {/* Circular logo */}
          <div
            className={`w-48 h-48 rounded-full mx-auto mb-8 flex items-center justify-center ${
              theme === "dark" ? "bg-gray-800" : "bg-green-50"
            }`}
          >
            <FaWhatsapp className="text-9xl text-green-500" />
          </div>

          {/* Title and description */}
          <h1
            className={`text-3xl font-bold mb-4 ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          >
            Welcome to WhatsApp
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
    );
  }

  return (
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
          onClick={() => setSelectedContact(null)}
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
          <button className="focus:outline-none">
            <FaVideo className="h-5 w-5" />
          </button>
          <button className="focus:outline-none">
            <FaEllipsisV className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div
        className={`flex-1 p-4 overflow-y-auto ${
          theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
        }`}
      >
        {Object.entries(groupMessages).map(([date, msgs]) => (
          <React.Fragment key={date}>
            {renderDateSeparator(new Date(date))}
            {msgs
              .filter(
                (msg) => msg.conversation === selectedContact?.conversation?._id
              )
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
          </React.Fragment>
        ))}
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
        className={`p-4 ${
          theme === "dark" ? "bg-[#303430]" : "bg-white"
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
          <div ref={EmojiPickerRef} className="absolute bottom-16 left-0 z-50">
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
        />
        <button
          onClick={handleSendMessage}
          className={`ml-2 p-3.5 rounded-full text-white ${
            theme === "dark" ? "bg-green-600" : "bg-green-500"
          } hover:bg-green-700 focus:outline-none`}
        >
          <IoSend />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
