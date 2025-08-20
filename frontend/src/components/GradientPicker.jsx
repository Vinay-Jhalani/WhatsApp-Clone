import React, { useState } from "react";

const GradientPicker = ({ gradient, setGradient, theme }) => {
  const [startColor, setStartColor] = useState("#ff7e5f");
  const [endColor, setEndColor] = useState("#feb47b");

  const predefinedGradients = [
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  ];

  const updateGradient = (start, end) => {
    const newGradient = `linear-gradient(135deg, ${start} 0%, ${end} 100%)`;
    setGradient(newGradient);
  };

  return (
    <div className="space-y-4">
      {/* Predefined gradients */}
      <div>
        <p
          className={`text-sm font-medium mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-700"
          }`}
        >
          Choose a gradient:
        </p>
        <div className="flex flex-row justify-between">
          {predefinedGradients.map((grad, index) => (
            <button
              key={index}
              className={`w-10 h-10 rounded-full border-2 ${
                gradient === grad ? "border-blue-500" : "border-gray-300"
              }`}
              style={{ background: grad }}
              onClick={() => setGradient(grad)}
            />
          ))}
        </div>
      </div>

      {/* Custom gradient picker
      <div>
        <p
          className={`text-sm font-medium mb-2 ${
            theme === "dark" ? "text-white" : "text-gray-700"
          }`}
        >
          Create custom gradient:
        </p>
        <div className="flex gap-3 items-center">
          <div className="flex flex-col items-center">
            <input
              type="color"
              value={startColor}
              onChange={(e) => {
                setStartColor(e.target.value);
                updateGradient(e.target.value, endColor);
              }}
              className="w-10 h-10 rounded border"
            />
            <span
              className={`text-xs mt-1 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              Start
            </span>
          </div>
          <div className="flex flex-col items-center">
            <input
              type="color"
              value={endColor}
              onChange={(e) => {
                setEndColor(e.target.value);
                updateGradient(startColor, e.target.value);
              }}
              className="w-10 h-10 rounded border"
            />
            <span
              className={`text-xs mt-1 ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              }`}
            >
              End
            </span>
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default GradientPicker;
