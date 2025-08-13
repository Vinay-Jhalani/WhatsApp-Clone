import React from "react";
import PropTypes from "prop-types";

const SkeletonLoader = ({ theme }) => (
  <div
    className={`flex-1 h-screen w-full flex flex-col ${
      theme === "dark" ? "bg-gray-900" : "bg-gray-100"
    }`}
  >
    {/* Header Skeleton */}
    <div
      className={`p-4 ${
        theme === "dark"
          ? "bg-[#303420] text-white"
          : "bg-[rgb(230,242,245)] text-gray-600"
      } flex items-center animate-pulse`}
    >
      <div className="w-10 h-10 bg-gray-300 rounded-full mr-3"></div>
      <div className="flex-grow">
        <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
    </div>

    {/* Messages Skeleton */}
    <div
      className={`flex-1 p-4 ${
        theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
      } flex flex-col space-y-4 animate-pulse`}
    >
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-xs p-3 rounded-lg px-20 ${
              i % 2 === 0 ? "bg-gray-300 ml-auto" : "bg-gray-300"
            }`}
          >
            <div className="h-3 bg-gray-400 rounded w-full mb-1"></div>
            <div className="h-3 bg-gray-400 rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Input Skeleton */}
    <div
      className={`p-4 ${
        theme === "dark" ? "bg-[#303430]" : "bg-white"
      } flex items-center space-x-2 animate-pulse`}
    >
      <div className="w-6 h-6 bg-gray-300 rounded"></div>
      <div className="w-6 h-6 bg-gray-300 rounded"></div>
      <div className="flex-grow h-10 bg-gray-300 rounded-full"></div>
      <div className="w-10 h-10 bg-gray-300 rounded"></div>
    </div>
  </div>
);

SkeletonLoader.propTypes = {
  theme: PropTypes.string.isRequired,
};

export default SkeletonLoader;
