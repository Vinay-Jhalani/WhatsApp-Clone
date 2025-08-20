import React, { useEffect, useState } from "react";
import useThemeStore from "../../store/useThemeStore";
import useUserStore from "../../store/useUserStore";
import useStatusStore from "../../store/useStatusStore";
import Layout from "../../components/Layout";
import StatusPreview from "./StatusPreview";
import StatusTypeSelector from "../../components/StatusTypeSelector";
import TextStatusCreator from "../../components/TextStatusCreator";
import MediaStatusCreator from "../../components/MediaStatusCreator";
import { motion } from "framer-motion";
import Avatar from "../../components/Avatar";
import { FaEllipsisH, FaPlus, FaCamera } from "react-icons/fa";
import formatTimestamp from "../../utils/formatTime";
import StatusList from "./StatusList";

const Status = () => {
  const [previewContact, setPreviewContact] = useState(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [showOptions, setShowOptions] = useState(false);

  // Status creation flow states
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showTextCreator, setShowTextCreator] = useState(false);
  const [showMediaCreator, setShowMediaCreator] = useState(false);
  const [mediaType, setMediaType] = useState("photo"); // "photo" or "video"

  const { theme } = useThemeStore();
  const { user } = useUserStore();

  //status store
  const {
    statuses,
    loading,
    error,
    createStatus,
    fetchStatuses,
    viewStatus,
    deleteStatus,
    likeStatus,
    getGroupedStatus,
    getUserStatuses,
    getOtherStatuses,
    clearError,
    initializeSocket,
    cleanupSocket,
  } = useStatusStore();

  const userStatus = getUserStatuses(user?._id);
  const otherStatus = getOtherStatuses(user?._id);

  // Debug logging for status grouping
  console.log("user ID:", user?._id);
  console.log("statuses from store:", statuses);
  console.log("groupedStatus:", getGroupedStatus());
  console.log("userStatus:", userStatus);
  console.log("otherStatus:", otherStatus);

  useEffect(() => {
    fetchStatuses();
    initializeSocket();
    return () => {
      cleanupSocket();
    };
  }, [fetchStatuses, initializeSocket, cleanupSocket]);

  // clear the error when page mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Handler functions for the new flow
  const handleCreateStatusClick = () => {
    setShowTypeSelector(true);
  };

  const handleTypeSelect = (type) => {
    setShowTypeSelector(false);

    if (type === "text") {
      setShowTextCreator(true);
    } else if (type === "photo") {
      setMediaType("photo");
      setShowMediaCreator(true);
    } else if (type === "video") {
      setMediaType("video");
      setShowMediaCreator(true);
    }
  };

  const handleStatusCreate = async (statusData) => {
    try {
      await createStatus(statusData);

      // Close all modals
      setShowTextCreator(false);
      setShowMediaCreator(false);
      setShowTypeSelector(false);
    } catch (error) {
      console.error("Error creating status:", error);
    }
  };

  const formatStatusPreview = (status) => {
    if (status.contentType !== "text") {
      return (
        status.contentType &&
        status.contentType.charAt(0).toUpperCase() + status.contentType.slice(1)
      );
    }

    const content = status.media || status.content || "Status";
    const singleLine = content.replace(/\n/g, " ");
    return singleLine.length > 30
      ? singleLine.slice(0, 30) + "..."
      : singleLine;
  };

  const handleCloseCreators = () => {
    setShowTypeSelector(false);
    setShowTextCreator(false);
    setShowMediaCreator(false);
  };

  const handleViewStatus = async (statusId) => {
    console.log("Attempting to view status with ID:", statusId);
    if (!statusId) {
      console.error("Status ID is undefined or null");
      return;
    }
    try {
      await viewStatus(statusId);
    } catch (error) {
      console.error("Error viewing status:", error);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      setShowOptions(false);
      handlePreviewClose();
    } catch (error) {
      console.error("Error deleting status:", error);
    }
  };

  const handleLikeStatus = async (statusId) => {
    console.log("Liking status:", statusId);
    try {
      const result = await likeStatus(statusId);
      console.log("Like result:", result);
    } catch (error) {
      console.error("Error liking status:", error);
    }
  };

  const handlePreviewClose = () => {
    setPreviewContact(null);
    setCurrentStatusIndex(0);
  };

  const handlePreviewNext = () => {
    console.log("handlePreviewNext called", {
      currentStatusIndex,
      totalStatuses: previewContact?.statuses?.length,
      previewContact: !!previewContact,
    });

    if (!previewContact || !previewContact.statuses) {
      console.log("No previewContact or statuses, closing");
      handlePreviewClose();
      return;
    }

    if (currentStatusIndex < previewContact.statuses.length - 1) {
      const nextIndex = currentStatusIndex + 1;
      setCurrentStatusIndex(nextIndex);
      // Mark next status as viewed if not already
      const nextStatus = previewContact.statuses[nextIndex];
      if (nextStatus && !nextStatus.viewed) {
        handleViewStatus(nextStatus.id || nextStatus._id);
      }
    } else {
      console.log("Reached end of statuses, closing");
      handlePreviewClose();
    }
  };

  const handlePreviewPrev = () => {
    setCurrentStatusIndex((prev) => {
      const newIndex = Math.max(prev - 1, 0);
      // Mark previous status as viewed if not already
      if (previewContact && previewContact.statuses) {
        const prevStatus = previewContact.statuses[newIndex];
        if (prevStatus && !prevStatus.viewed) {
          handleViewStatus(prevStatus.id || prevStatus._id);
        }
      }
      return newIndex;
    });
  };

  const handleStatusPreview = (contact, statusIndex = 0) => {
    console.log("Opening status preview:", { contact, statusIndex });
    setPreviewContact(contact);
    setCurrentStatusIndex(statusIndex);

    if (contact?.statuses?.[statusIndex]) {
      const status = contact.statuses[statusIndex];
      console.log("Status object:", status);
      console.log("Status ID:", status.id);
      handleViewStatus(status.id);
    }
  };

  console.log("userStatus", userStatus);
  console.log("otherStatus", otherStatus);

  return (
    <Layout
      isStatusPreviewOpen={!!previewContact}
      statusPreviewContent={
        previewContact && (
          <StatusPreview
            key={`${currentStatusIndex}-${Date.now()}`}
            contact={previewContact}
            currentIndex={currentStatusIndex}
            onClose={handlePreviewClose}
            onNext={handlePreviewNext}
            onPrev={handlePreviewPrev}
            onDelete={handleDeleteStatus}
            onLike={handleLikeStatus}
            theme={theme}
            currentUser={user}
          />
        )
      }
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className={`flex-1 h-screen border-r border-gray-300 ${
          theme === "dark"
            ? "bg-[rgb(12,19,24)] text-white"
            : "bg-white text-black"
        }`}
      >
        <div
          className={`flex justify-between items-center shadow-md ${
            theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
          } p-4`}
        >
          <h2 className="text-2xl font-bold">Status</h2>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mx-4 mt-2">
            <span className="block sm:inline">{error}</span>
            <button className="float-right text-red-500 hover:text-red-700">
              <RxCross2 className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          <div
            className={`flex space-x-4 py-3 px-3 shadow-md ${
              theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-gray-100/90"
            }`}
          >
            <div
              className="relative cursor-pointer"
              onClick={() =>
                userStatus
                  ? handleStatusPreview(userStatus)
                  : handleCreateStatusClick()
              }
            >
              {user?.profileAvatar ? (
                <img
                  src={user?.profileAvatar}
                  alt={user?.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <Avatar
                  name={user?.username}
                  size="w-12 h-12"
                  textSize="text-base"
                />
              )}
              {userStatus ? (
                <>
                  <svg
                    className="absolute top-0 left-0 w-12 h-12"
                    viewBox="0 0 100 100"
                  >
                    {userStatus.statuses.map((_, index) => {
                      const circumference = 2 * Math.PI * 48;
                      const segmentLength =
                        circumference / userStatus.statuses.length;
                      const constOffset = index * segmentLength;
                      return (
                        <circle
                          key={index}
                          cx="50"
                          cy="50"
                          r="48"
                          fill="none"
                          stroke="#25D366"
                          strokeWidth="4"
                          strokeDasharray={`${segmentLength - 5} 5`}
                          strokeDashoffset={-constOffset}
                          transform={`rotate(${
                            index * (360 / userStatus.statuses.length)
                          }, 50, 50)`}
                        />
                      );
                    })}
                  </svg>
                  <button
                    className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateStatusClick();
                    }}
                  >
                    <FaPlus className="h-2 w-2" />
                  </button>
                </>
              ) : (
                <button
                  className="absolute bottom-0 right-0 bg-green-500 text-white p-1 rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateStatusClick();
                  }}
                >
                  <FaPlus className="h-2 w-2" />
                </button>
              )}
            </div>

            <div className="flex flex-col items-start flex-1">
              <p className="font-semibold">My Status</p>

              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                {userStatus
                  ? `${userStatus.statuses.length} status${
                      userStatus?.statuses.length > 1 ? "es" : ""
                    }, Updated: ${formatTimestamp(
                      userStatus.statuses[0].timeStamp
                    )}`
                  : "Tap to add status update"}
              </p>
            </div>

            {userStatus && (
              <button
                className="ml-auto"
                onClick={() => setShowOptions(!showOptions)}
              >
                <FaEllipsisH
                  className={`h-5 w-5 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                />
              </button>
            )}
          </div>

          {/* Options Menu */}
          {showOptions && userStatus && (
            <div
              className={`shadow-md p-2 ${
                theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
              }`}
            >
              <button
                className="w-full text-left text-green-500 py-2 hover:bg-gray-100 px-2 rounded flex items-center"
                onClick={() => {
                  handleCreateStatusClick();
                  setShowOptions(false);
                }}
              >
                <FaCamera className="inline-block mr-2" /> Add Status
              </button>

              <button
                className="w-full text-left text-blue-500 py-2 hover:bg-gray-100 px-2 rounded"
                onClick={() => {
                  handleStatusPreview(userStatus);
                  setShowOptions(false);
                }}
              >
                View Status
              </button>
            </div>
          )}

          {loading && (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          )}

          {/* My status list (render each of user's statuses) */}
          {userStatus && (
            <div
              className={`p-4 mt-3 rounded-md ${
                theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
              }`}
            >
              <h3
                className={`font-semibold mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                My Updates
              </h3>
              <div className="space-y-2">
                {userStatus.statuses.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    onClick={() => handleStatusPreview(userStatus, idx)}
                    className={`cursor-pointer flex items-center space-x-3 p-2 rounded ${
                      theme === "dark"
                        ? "hover:bg-gray-800"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {user?.profileAvatar ? (
                        <img
                          src={user.profileAvatar}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Avatar
                          name={user?.username}
                          size="w-10 h-10"
                          textSize="text-sm"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {user?.username || "You"}
                      </div>
                      <div
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        {formatStatusPreview(s)} •{" "}
                        {formatTimestamp(s.timeStamp || s.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent update from other users */}
          {!loading && otherStatus.length > 0 && (
            <div
              className={`p-4 space-y-4 shadow-md mt-4 ${
                theme === "dark" ? "bg-[rgb(17,27,33)]" : "bg-white"
              }`}
            >
              <h3
                className={`font-semibold ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                Recent Update
              </h3>
              {otherStatus.map((contact, index) => (
                <React.Fragment key={contact?.id}>
                  <StatusList
                    contact={contact}
                    onPreview={() => handleStatusPreview(contact)}
                    theme={theme}
                  />
                  {index < otherStatus.length - 1 && (
                    <hr
                      className={`${
                        theme === "dark" ? "border-gray-700" : "border-gray-200"
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && statuses.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div
                className={`text-6xl mb-4 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-300"
                }`}
              >
                📱
              </div>
              <h3
                className={`text-lg font-semibold mb-2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                No Status updated yet
              </h3>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-500" : "text-gray-600"
                }`}
              >
                Be the first to share a status update
              </p>
            </div>
          )}
        </div>

        {/* Status Creation Components */}
        {showTypeSelector && (
          <StatusTypeSelector
            onClose={handleCloseCreators}
            onSelectType={handleTypeSelect}
            theme={theme}
          />
        )}

        {showTextCreator && (
          <TextStatusCreator
            onClose={handleCloseCreators}
            onCreate={handleStatusCreate}
            theme={theme}
            loading={loading}
          />
        )}

        {showMediaCreator && (
          <MediaStatusCreator
            onClose={handleCloseCreators}
            onCreate={handleStatusCreate}
            loading={loading}
            type={mediaType}
          />
        )}
      </motion.div>
    </Layout>
  );
};

export default Status;
