import React from "react";
import { FaCamera, FaVideo, FaFont, FaTimes } from "react-icons/fa";
import { IoMdText } from "react-icons/io";

const StatusTypeSelector = ({ onClose, onSelectType, theme }) => {
  const statusTypes = [
    {
      id: "text",
      label: "Text",
      icon: FaFont,
      color: "bg-green-500",
      description: "Share a text status",
    },
    {
      id: "photo",
      label: "Photo",
      icon: FaCamera,
      color: "bg-blue-500",
      description: "Share a photo",
    },
    {
      id: "video",
      label: "Video",
      icon: FaVideo,
      color: "bg-purple-500",
      description: "Share a video",
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div
        className={`w-full rounded-t-3xl p-6 pb-8 ${
          theme === "dark" ? "bg-gray-900" : "bg-white"
        } transform transition-transform duration-300 ease-out`}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            Create Status
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-full ${
              theme === "dark"
                ? "text-gray-400 hover:text-white hover:bg-gray-800"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            } transition-colors`}
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Status Type Options */}
        <div className="space-y-4">
          {statusTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectType(type.id)}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl transition-colors ${
                  theme === "dark"
                    ? "hover:bg-gray-800 border border-gray-700"
                    : "hover:bg-gray-50 border border-gray-200"
                }`}
              >
                <div className={`p-3 rounded-full ${type.color}`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <p
                    className={`font-medium ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {type.label}
                  </p>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StatusTypeSelector;
