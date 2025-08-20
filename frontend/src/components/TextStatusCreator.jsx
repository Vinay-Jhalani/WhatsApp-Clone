import React, { useState, useRef } from "react";
import { FaTimes, FaPalette, FaCheck } from "react-icons/fa";
import { IoMdColorPalette } from "react-icons/io";

const TextStatusCreator = ({ onClose, onCreate, theme, loading }) => {
  const [text, setText] = useState("");
  const [gradient, setGradient] = useState(
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  );
  const [showColorPicker, setShowColorPicker] = useState(false);
  const textAreaRef = useRef(null);

  const predefinedGradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    "linear-gradient(135deg, #ff7e5f 0%, #feb47b 100%)",
    "linear-gradient(135deg, #86a8e7 0%, #91eae4 100%)",
    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
    "linear-gradient(135deg, #06b6d4 0%, #67e8f9 100%)",
  ];

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleCreate = () => {
    if (text.trim()) {
      onCreate({
        content: text.trim(),
        backgroundColor: gradient,
        type: "text",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Main Content */}
      <div
        className="flex-1 flex flex-col relative"
        style={{ background: gradient }}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
          >
            <FaTimes className="h-6 w-6" />
          </button>

          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-2 rounded-full bg-black/20 text-white hover:bg-black/30 transition-colors"
          >
            <IoMdColorPalette className="h-6 w-6" />
          </button>
        </div>

        {/* Text Input Area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <textarea
            ref={textAreaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Type a status..."
            className="w-full max-w-md text-center text-white placeholder-white/70 bg-transparent border-none outline-none resize-none text-2xl leading-relaxed"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              caretColor: "white",
              maxHeight: "60vh",
            }}
            rows={6}
            maxLength={700}
            autoFocus
          />
        </div>

        {/* Character count */}
        <div className="absolute bottom-20 right-4">
          <span className="text-white/70 text-sm">{text.length}/700</span>
        </div>

        {/* Post Button */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <button
            onClick={handleCreate}
            disabled={!text.trim() || loading}
            className="bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <FaCheck className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Color Picker Panel */}
      {showColorPicker && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl p-6 max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3
              className={`text-lg font-semibold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Choose Background
            </h3>
            <button
              onClick={() => setShowColorPicker(false)}
              className={`p-2 rounded-full ${
                theme === "dark"
                  ? "text-gray-400 hover:text-white hover:bg-gray-800"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              } transition-colors`}
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {predefinedGradients.map((grad, index) => (
              <button
                key={index}
                className={`aspect-square rounded-xl border-4 transition-all ${
                  gradient === grad
                    ? "border-blue-500 scale-105"
                    : "border-transparent hover:border-gray-300"
                }`}
                style={{ background: grad }}
                onClick={() => {
                  setGradient(grad);
                  setShowColorPicker(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextStatusCreator;
