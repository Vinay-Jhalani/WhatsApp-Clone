import { format } from "date-fns";
import React, { useRef, useState, useEffect } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaTrash,
  FaReply,
  FaPlus,
  FaChevronDown,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { MdContentCopy } from "react-icons/md";
import { BsEmojiSmile } from "react-icons/bs";
import EmojiPicker from "emoji-picker-react";

const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
  preRenderedPicker,
  emojisLoaded,
}) => {
  // console.log("MessageBubble rendered with message:", message);
  const messageRef = useRef(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
  });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const contextMenuRef = useRef(null);
  const isUserMessage = message.sender._id === currentUser._id;

  // Handle right click on message
  const handleContextMenu = (e) => {
    e.preventDefault();

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position to prevent menu from going off-screen
    let x = e.clientX;
    let y = e.clientY;

    // Ensure the menu stays within the viewport (assuming menu width is ~280px and height ~200px)
    // Add a 10px buffer from the edges
    const buffer = 10;
    const menuWidth = 280;
    const menuHeight = 200;

    // Keep menu within horizontal bounds
    if (x < menuWidth / 2 + buffer) {
      x = menuWidth / 2 + buffer; // Left edge
    } else if (x > viewportWidth - menuWidth / 2 - buffer) {
      x = viewportWidth - menuWidth / 2 - buffer; // Right edge
    }

    // Keep menu within vertical bounds
    if (y > viewportHeight - menuHeight - buffer) {
      y = viewportHeight - menuHeight - buffer; // Bottom edge
    }

    setContextMenu({ visible: true, x, y, viewportWidth, viewportHeight });
  };

  // Handle click outside to close context menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target)
      ) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Handle clicks outside the emoji picker
  useEffect(() => {
    const handleClickOutsideEmojiPicker = (e) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideEmojiPicker);
    return () =>
      document.removeEventListener("mousedown", handleClickOutsideEmojiPicker);
  }, []);

  // Function to check if content contains only emojis and how many
  const getEmojiInfo = (content) => {
    // Regex to match emoji characters
    const emojiRegex = /[\p{Emoji}]/gu;
    const emojisOnly = content.replace(emojiRegex, "").trim() === "";
    const emojiCount = content.match(emojiRegex)?.length || 0;

    return {
      isOnlyEmojis: emojisOnly && emojiCount > 0,
      count: emojiCount,
      // More consistent sizing across all emoji counts
      sizeClass: emojisOnly
        ? emojiCount === 1
          ? "text-5xl"
          : emojiCount === 2
          ? "text-4xl"
          : emojiCount === 3
          ? "text-3xl"
          : emojiCount >= 4
          ? "text-2xl"
          : "text-base"
        : "text-base",
    };
  };

  const bubbleClass = isUserMessage ? `chat-end` : `chat-start`;

  // All bubbles will have consistent styling now

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] min-w-[70px] rounded-lg px-3 py-1.5 ${
        theme === "dark" ? "bg-[#005c4b] text-white" : "bg-[#005c4b] text-white"
      }`
    : `chat-bubble md:max-w-[50%] min-w-[70px] rounded-lg px-3 py-1.5 ${
        theme === "dark"
          ? "bg-[#1f2c34] text-white"
          : "bg-white text-black border border-gray-200"
      }`;

  const quickReactions = ["👍", "❤️", "😂", "😢", "😡"];

  // Use this function for all emoji reactions to ensure consistent behavior
  const handleReact = (emoji) => {
    // Make sure to use the emoji directly if it comes from an emoji object
    const emojiValue =
      typeof emoji === "object" && emoji.emoji ? emoji.emoji : emoji;
    onReact(message._id, emojiValue);
    setShowEmojiPicker(false);
  };

  if (message === 0) return;
  return (
    <div className={`chat ${bubbleClass} mb-7`}>
      <div
        className={`${bubbleContentClass} relative group shadow-sm flex items-center justify-center cursor-pointer`}
        ref={messageRef}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          // Don't immediately hide the emoji button
          // Instead rely on the hover detection in the container
          setTimeout(() => {
            const hoveredElements = document.querySelectorAll(":hover");
            const stillHovering = Array.from(hoveredElements).some(
              (el) =>
                el.classList.contains("emoji-button-container") ||
                el.classList.contains("message-hover-area")
            );

            if (!stillHovering) {
              setIsHovered(false);
            }
          }, 50);
        }}
      >
        {/* Invisible hover area that connects the message to the emoji button */}
        {isHovered && (
          <div
            className={`message-hover-area absolute ${
              isUserMessage
                ? "left-[-40px] md:left-[-50px] w-[40px] md:w-[50px]"
                : "right-[-40px] md:right-[-50px] w-[40px] md:w-[50px]"
            } top-0 bottom-0 z-[1]`}
            onMouseEnter={() => setIsHovered(true)}
          />
        )}
        {/* Emoji button that appears on hover - positioned based on message direction */}
        {isHovered && (
          <div
            className={`absolute emoji-button-container ${
              isUserMessage ? "-left-13 md:-left-14" : "-right-13 md:-right-14"
            } top-1/2 transform -translate-y-1/2 z-10`}
            ref={emojiButtonRef}
            onMouseEnter={() => setIsHovered(true)}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();

              // Get viewport dimensions
              const viewportWidth = window.innerWidth;
              const viewportHeight = window.innerHeight;

              // Calculate menu position
              const menuWidth = 280; // approximate width of context menu
              const menuHeight = 200; // approximate height of context menu
              const buffer = 10;

              // Initial position centered on the emoji button
              let x = rect.x + rect.width / 2;
              let y = rect.y;

              // Adjust for small screens - ensure menu stays within viewport
              // For very narrow screens, position menu centered in viewport instead of on button
              if (viewportWidth < 500) {
                // On mobile, position menu more centered on screen
                x = viewportWidth / 2;

                // Ensure menu doesn't go off bottom of screen
                const bottomSpace = viewportHeight - rect.y;
                if (bottomSpace < menuHeight + buffer) {
                  // Position above button if not enough space below
                  y = rect.y - buffer - (isUserMessage ? 0 : menuHeight);
                } else {
                  // Position below button
                  y = rect.y + (isUserMessage ? 0 : rect.height);
                }
              }

              setContextMenu({
                visible: true,
                x,
                y,
                viewportWidth,
                viewportHeight,
              });
            }}
          >
            <button
              className={`flex items-center justify-center  ${
                theme === "dark"
                  ? "bg-[#1F2C34] hover:bg-[#384045] text-white"
                  : "bg-white hover:bg-gray-100 text-gray-800 border border-gray-200"
              } rounded-full p-2 shadow-lg transition-all`}
            >
              <BsEmojiSmile size={18} />
              <FaChevronDown size={10} className="ml-1" />
            </button>
          </div>
        )}
        <div className="w-full flex flex-col">
          {/* Reactions display - only shown if there are reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div
              className={`absolute -bottom-6.5 right-4 ${
                theme === "dark" ? "bg-[#1F2C34]" : "bg-yellow-100 "
              } rounded-full px-1.5 py-0.5 shadow-lg drop-shadow-md flex items-center gap-0.5 z-10`}
            >
              {message.reactions.slice(0, 2).map((reaction, index) => (
                <span key={index} className="text-lg ">
                  {reaction.emoji}
                </span>
              ))}
              {message.reactions.length > 2 && (
                <span className="text-xs text-gray-400 ml-0.5">
                  +{message.reactions.length - 2}
                </span>
              )}
            </div>
          )}
          {message.contentType === "text" &&
            (() => {
              const emojiInfo = getEmojiInfo(message.content);
              return (
                <div className="flex flex-wrap items-center w-full">
                  {emojiInfo.isOnlyEmojis ? (
                    <p
                      className={`${emojiInfo.sizeClass} leading-tight pr-14 flex items-center justify-center w-full`}
                    >
                      {message.content}
                    </p>
                  ) : (
                    <p className="text-2xl leading-tight pr-14">
                      {message.content}
                    </p>
                  )}
                  <div className="absolute bottom-1 right-2 flex items-center justify-end gap-1 text-[10px] opacity-70">
                    <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                    {isUserMessage && (
                      <>
                        {message.messageStatus === "sent" && (
                          <FaCheck size={9} />
                        )}
                        {message.messageStatus === "delivered" && (
                          <FaCheckDouble size={9} />
                        )}
                        {message.messageStatus === "read" && (
                          <FaCheckDouble className="text-blue-400" size={9} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          {message.contentType === "image" && (
            <div>
              <img
                src={message.imageOrVideoUrl}
                alt="Image-video"
                className="max-w-xs rounded-md"
              />
              <div className="flex items-end mt-1">
                {message.content &&
                  (() => {
                    const emojiInfo = getEmojiInfo(message.content);
                    return emojiInfo.isOnlyEmojis ? (
                      <p
                        className={`${emojiInfo.sizeClass} leading-tight pr-14 flex items-center justify-center w-full`}
                      >
                        {message.content}
                      </p>
                    ) : (
                      <p className="text-base leading-tight pr-14">
                        {message.content}
                      </p>
                    );
                  })()}
                <div className="absolute bottom-1 right-2 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                  {isUserMessage && (
                    <>
                      {message.messageStatus === "sent" && <FaCheck size={9} />}
                      {message.messageStatus === "delivered" && (
                        <FaCheckDouble size={9} />
                      )}
                      {message.messageStatus === "read" && (
                        <FaCheckDouble className="text-blue-400" size={9} />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu.visible && (
          <div
            ref={contextMenuRef}
            className="fixed z-50 bg-[#1F2C34] rounded-md shadow-xl overflow-hidden"
            style={(() => {
              // Mobile-friendly positioning
              const isMobile = contextMenu.viewportWidth < 500;
              let menuStyle = {
                top: `${contextMenu.y}px`,
                left: `${contextMenu.x}px`,
                maxWidth: "280px",
                transform: "translateX(-50%)", // Center the menu at cursor position
              };

              // For very small screens, make menu take up most of the width
              if (isMobile) {
                menuStyle = {
                  ...menuStyle,
                  width: "calc(100% - 40px)", // Full width minus margins
                  maxWidth: "280px",
                  left: "50%",
                  transform: "translateX(-50%)",
                };
              }

              return menuStyle;
            })()}
          >
            {/* Reaction Options */}
            <div className="px-2 py-3 flex justify-between items-center bg-[#1F2C34]">
              {quickReactions.map((emoji, index) => (
                <button
                  key={index}
                  className="p-2 rounded-full transition-all transform hover:bg-[#384045] hover:scale-110"
                  onClick={() => {
                    handleReact(emoji);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                >
                  <span className="text-xl">{emoji}</span>
                </button>
              ))}
              {/* Plus button for more emoji options */}
              <button
                className="p-2 rounded-full transition-all transform hover:bg-[#384045] hover:scale-110"
                onClick={() => {
                  // Store current viewport dimensions when showing emoji picker
                  const viewportWidth = window.innerWidth;
                  const viewportHeight = window.innerHeight;
                  // Keep the position information but update visible state
                  setContextMenu({
                    ...contextMenu,
                    visible: false,
                    viewportWidth,
                    viewportHeight,
                  });
                  setShowEmojiPicker(true);
                }}
              >
                <span className="text-xl flex items-center justify-center w-6 h-6 bg-[#384045] rounded-md font-medium">
                  {<FaPlus size={15} />}
                </span>
              </button>
            </div>

            {/* Other Options */}
            <div className="bg-[#1F2C34]">
              <button className="flex items-center gap-4 w-full text-left px-4 py-3 text-white hover:bg-[#384045] transition-colors">
                <MdContentCopy className="text-gray-300" />
                <span>Copy</span>
              </button>
              {isUserMessage && (
                <button
                  className="flex items-center gap-4 w-full text-left px-4 py-3 hover:bg-[#384045] text-white transition-colors"
                  onClick={() => {
                    deleteMessage(message._id);
                    setContextMenu({ ...contextMenu, visible: false });
                  }}
                >
                  <FaTrash className="text-gray-300" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Emoji Picker for "Plus" button */}
        {showEmojiPicker && (
          <div
            ref={emojiPickerRef}
            className="fixed z-50 shadow-xl"
            style={(() => {
              // Calculate best position for emoji picker
              const isMobile = window.innerWidth < 500;
              const emojiWidth = isMobile
                ? Math.min(300, window.innerWidth - 40)
                : 300;
              const emojiHeight = 350;
              const buffer = 10;

              // Mobile-optimized positioning
              if (isMobile) {
                // Center on screen for mobile
                return {
                  top: `${Math.max(
                    buffer,
                    window.innerHeight / 2 - emojiHeight / 2
                  )}px`,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: `${emojiWidth}px`,
                };
              }

              // Desktop positioning
              // Start with positioning above the context menu
              let top = contextMenu.y - emojiHeight - buffer;
              let left = contextMenu.x;

              // If too close to top, position below instead
              if (top < buffer) {
                top = contextMenu.y + buffer;
              }

              // If too close to right edge, adjust horizontally
              if (left + emojiWidth / 2 > contextMenu.viewportWidth - buffer) {
                left = contextMenu.viewportWidth - emojiWidth / 2 - buffer;
              }

              // If too close to left edge
              if (left - emojiWidth / 2 < buffer) {
                left = emojiWidth / 2 + buffer;
              }

              return {
                top: `${top}px`,
                left: `${left}px`,
                transform: "translateX(-50%)", // Center horizontally
              };
            })()}
          >
            {emojisLoaded ? (
              // Don't use preRenderedPicker directly since it has the wrong callback
              // Instead, always create a new picker with the correct reaction handler
              <EmojiPicker
                onEmojiClick={(emojiObject) => handleReact(emojiObject.emoji)}
                theme={theme}
                preload={true}
                lazyLoadEmojis={false}
                searchPlaceHolder="Search emoji..."
                width={
                  window.innerWidth < 500
                    ? Math.min(300, window.innerWidth - 40)
                    : 300
                }
                height={window.innerWidth < 500 ? 300 : 350}
                autoFocusSearch={false}
                searchDisabled={true}
              />
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
      </div>
    </div>
  );
};

export default MessageBubble;
