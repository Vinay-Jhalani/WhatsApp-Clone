import React, { useState, useRef, useEffect } from "react";
import { FaTimes, FaCheck, FaCamera, FaVideo } from "react-icons/fa";

const MediaStatusCreator = ({ onClose, onCreate, loading, type = "photo" }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Auto-open file picker when component mounts with a small delay
    const timer = setTimeout(() => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);

      // Validate file type
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if ((type === "video" && !isVideo) || (type === "photo" && !isImage)) {
        alert(`Please select a ${type} file`);
        return;
      }

      // Clean up previous preview URL
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }

      setFilePreview(URL.createObjectURL(file));
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const handleCreate = () => {
    if (selectedFile) {
      onCreate({
        file: selectedFile,
        caption: caption.trim(),
        type: selectedFile.type.startsWith("video/") ? "video" : "image",
      });
    }
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setCaption("");

    // Reset the file input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";

      // Use setTimeout to ensure the DOM is updated before clicking
      setTimeout(() => {
        fileInputRef.current.click();
      }, 50);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors"
        >
          <FaTimes className="h-6 w-6" />
        </button>

        {filePreview && (
          <button
            onClick={handleRetake}
            className="px-4 py-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors text-sm font-medium"
          >
            Retake
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        {filePreview ? (
          <div className="flex items-center justify-center w-full h-full">
            {selectedFile?.type.startsWith("video/") ? (
              <video
                src={filePreview}
                className="max-w-[400px] max-h-[700px] w-auto h-auto object-contain rounded-lg shadow-lg mx-auto"
                controls
                autoPlay
                muted
                loop
              />
            ) : (
              <img
                src={filePreview}
                alt="Selected media"
                className="max-w-[400px] max-h-[700px] w-auto h-auto object-contain rounded-lg shadow-lg mx-auto"
              />
            )}
          </div>
        ) : (
          <div className="text-center text-white">
            <div className="mb-4">
              {type === "video" ? (
                <FaVideo className="h-16 w-16 mx-auto mb-4 text-white/70" />
              ) : (
                <FaCamera className="h-16 w-16 mx-auto mb-4 text-white/70" />
              )}
            </div>
            <p className="text-lg mb-4">No {type} selected</p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleRetake();
              }}
              className="bg-white/20 text-white px-6 py-3 rounded-full hover:bg-white/30 transition-colors"
            >
              Choose {type === "video" ? "Video" : "Photo"}
            </button>
          </div>
        )}
      </div>

      {/* Caption Input */}
      {filePreview && (
        <div className="absolute bottom-20 left-0 right-0 px-4">
          <div className="bg-black/50 rounded-full px-4 py-3">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent text-white placeholder-white/70 outline-none text-lg"
              maxLength={300}
            />
          </div>
          {caption.length > 0 && (
            <div className="text-right mt-2">
              <span className="text-white/70 text-sm">
                {caption.length}/300
              </span>
            </div>
          )}
        </div>
      )}

      {/* Post Button */}
      {filePreview && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleCreate}
            disabled={!selectedFile || loading}
            className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FaCheck className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={type === "video" ? "video/*" : "image/*"}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default MediaStatusCreator;
