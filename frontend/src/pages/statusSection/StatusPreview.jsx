import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import {
  FaTrash,
  FaHeart,
  FaRegHeart,
  FaPlay,
  FaPause,
  FaEye,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { IoMdClose } from "react-icons/io";
import Avatar from "../../components/Avatar";
import formatTimestamp from "../../utils/formatTime";

const StatusPreview = ({
  contact,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onDelete,
  onLike,
  currentUser,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const progressBarRef = useRef(null);

  // Ensure currentIndex is valid
  const validIndex = Math.max(
    0,
    Math.min(currentIndex, (contact?.statuses?.length || 1) - 1)
  );
  const currentStatus = contact?.statuses?.[validIndex];
  const isOwner = currentUser?._id === contact?.id;
  const isVideo = currentStatus?.contentType === "video";
  const isImage = currentStatus?.contentType === "image";
  const isText = currentStatus?.contentType === "text";

  // Progress bar animation
  useEffect(() => {
    if (!isPlaying || !currentStatus) return;

    // Reset progress immediately when status changes
    if (progressBarRef.current) {
      progressBarRef.current.style.width = "0%";
    }

    const duration = isVideo ? 15000 : 5000; // 15s for video, 5s for others
    const incrementValue = 100 / (duration / 100);
    let currentProgress = 0;

    const interval = setInterval(() => {
      currentProgress = Math.min(currentProgress + incrementValue, 100);

      // Update progress bar directly via DOM for smooth animation
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${currentProgress}%`;
      }
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPlaying, isVideo, currentStatus]);

  // Auto-advance timer (separate from progress animation)
  useEffect(() => {
    if (!isPlaying || !currentStatus) return;

    const duration = isVideo ? 15000 : 5000;

    const timer = setTimeout(() => {
      onNext();
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, isPlaying, isVideo, currentStatus, onNext]);

  // Check if current user has liked this status
  useEffect(() => {
    if (currentStatus?.likedBy && currentUser?._id) {
      const hasLiked = currentStatus.likedBy.some(
        (likerId) =>
          likerId._id === currentUser._id || likerId === currentUser._id
      );
      setIsLiked(hasLiked);
    }
  }, [currentStatus, currentUser]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleLike = async () => {
    if (onLike && currentStatus?.id) {
      const prevLiked = isLiked;
      const prevLikedBy = currentStatus.likedBy
        ? [...currentStatus.likedBy]
        : [];
      let newLikedBy;
      if (!isLiked) {
        // Optimistically add current user to likedBy
        newLikedBy = [...prevLikedBy, currentUser._id];
      } else {
        // Optimistically remove current user from likedBy
        newLikedBy = prevLikedBy.filter(
          (likerId) =>
            likerId !== currentUser._id && likerId._id !== currentUser._id
        );
      }
      setIsLiked(!isLiked);
      currentStatus.likedBy = newLikedBy;
      try {
        await onLike(currentStatus.id);
      } catch (error) {
        // Revert on error
        setIsLiked(prevLiked);
        currentStatus.likedBy = prevLikedBy;
        console.error("Error liking status:", error);
      }
    }
  };

  const handleViewersClick = () => {
    setShowViewers(!showViewers);
  };

  // Helper function to check if a viewer has liked the status
  const hasViewerLikedStatus = (viewerId) => {
    if (!currentStatus?.likedBy) return false;
    return currentStatus.likedBy.some(
      (likerId) =>
        (likerId._id && likerId._id === viewerId) ||
        (typeof likerId === "string" && likerId === viewerId) ||
        likerId === viewerId
    );
  };

  // Guard clause - don't render if no valid status or contact
  if (!currentStatus || !contact) {
    console.log("Guard clause triggered - missing data:", {
      currentStatus: !!currentStatus,
      contact: !!contact,
      currentIndex,
      totalStatuses: contact?.statuses?.length,
    });
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4">
          {/* Progress bars */}
          <div className="flex space-x-1 mb-4">
            {contact.statuses.map((_, index) => (
              <div
                key={`${index}-${currentIndex}`}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  ref={index === currentIndex ? progressBarRef : null}
                  key={`progress-${index}-${currentIndex}`}
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width:
                      index < currentIndex
                        ? "100%"
                        : index === currentIndex
                        ? "0%" // Always start at 0%, DOM manipulation will handle updates
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Status info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <IoMdClose className="h-6 w-6" />
              </button>

              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
              ) : (
                <Avatar
                  name={contact.name}
                  size="w-10 h-10"
                  textSize="text-sm"
                />
              )}

              <div className="text-white">
                <p className="font-semibold text-sm">{contact.name}</p>
                <p className="text-xs text-gray-300">
                  {formatTimestamp(currentStatus.timeStamp)}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isOwner && (
                <>
                  <button
                    onClick={handleViewersClick}
                    className="text-white hover:text-gray-300 transition-colors flex items-center space-x-1"
                  >
                    <FaEye className="h-4 w-4" />
                    <span className="text-xs">
                      {currentStatus.viewers?.length || 0}
                    </span>
                  </button>

                  <button
                    onClick={() => onDelete(currentStatus.id)}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <FaTrash className="h-4 w-4" />
                  </button>
                </>
              )}

              <button
                onClick={handlePlayPause}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isPlaying ? (
                  <FaPause className="h-4 w-4" />
                ) : (
                  <FaPlay className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Navigation arrows */}
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
          disabled={currentIndex === 0}
        >
          <FaChevronLeft className="h-8 w-8" />
        </button>

        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10"
        >
          <FaChevronRight className="h-8 w-8" />
        </button>

        {/* Content */}
        <div className="w-full h-full flex items-center justify-center relative">
          {isText && (
            <div
              className="w-full h-full flex items-center justify-center text-white text-2xl font-bold text-center px-8 relative"
              style={{
                background:
                  currentStatus.backgroundColor ||
                  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <pre className="max-w-2xl leading-relaxed whitespace-pre-wrap text-center font-sans">
                {currentStatus.media || currentStatus.content}
              </pre>
            </div>
          )}

          {isImage && (
            <div className="w-full h-full relative">
              <img
                src={currentStatus.media || currentStatus.content}
                alt="Status"
                className="w-full h-full object-contain"
              />
              {currentStatus.caption && (
                <div className="absolute bottom-20 left-0 right-0 text-center text-white bg-black/50 p-4">
                  <p className="text-lg">{currentStatus.caption}</p>
                </div>
              )}
            </div>
          )}

          {isVideo && (
            <div className="w-full h-full relative">
              <video
                src={currentStatus.media || currentStatus.content}
                className="w-full h-full object-contain"
                autoPlay={isPlaying}
                muted
                loop
              />
              {currentStatus.caption && (
                <div className="absolute bottom-20 left-0 right-0 text-center text-white bg-black/50 p-4">
                  <p className="text-lg">{currentStatus.caption}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        {!isOwner && (
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center space-x-6">
            <button
              onClick={handleLike}
              className={`flex items-center space-x-2 transition-colors ${
                isLiked ? "text-red-500" : "text-white hover:text-red-400"
              }`}
            >
              {isLiked ? (
                <FaHeart className="h-6 w-6" />
              ) : (
                <FaRegHeart className="h-6 w-6" />
              )}
              <span className="text-sm">
                {currentStatus?.likedBy?.length > 0
                  ? `${currentStatus.likedBy.length} ${
                      currentStatus.likedBy.length === 1 ? "Like" : "Likes"
                    }`
                  : "Like"}
              </span>
            </button>
          </div>
        )}

        {/* Viewers modal */}
        {showViewers && isOwner && (
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-lg p-4 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Viewers ({currentStatus.viewers?.length || 0})
              </h3>
              <button
                onClick={() => setShowViewers(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <IoMdClose className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              {currentStatus.viewers?.map((viewer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {viewer.profilePicture ? (
                      <img
                        src={viewer.profilePicture}
                        alt={viewer.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <Avatar
                        name={viewer.username}
                        size="w-8 h-8"
                        textSize="text-xs"
                      />
                    )}
                    <span className="text-gray-900 dark:text-white text-sm">
                      {viewer.username}
                    </span>
                  </div>

                  {/* Show heart if viewer liked the status */}
                  {hasViewerLikedStatus(viewer._id || viewer.id) && (
                    <FaHeart className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )) || (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                  No views yet
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};

export default StatusPreview;
