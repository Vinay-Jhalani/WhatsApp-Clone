import React from "react";
import { LuUser } from "react-icons/lu";

const Avatar = ({
  name = "",
  size = "w-24 h-24",
  textSize = "text-2xl",
  className = "",
}) => {
  // Color mapping based on first letter
  const colorMap = {
    A: ["#ffcdd2", "#b71c1c"],
    B: ["#f8bbd0", "#880e4f"],
    C: ["#e1bee7", "#4a148c"],
    D: ["#d1c4e9", "#311b92"],
    E: ["#c5cae9", "#1a237e"],
    F: ["#bbdefb", "#0d47a1"],
    G: ["#b2ebf2", "#006064"],
    H: ["#b2dfdb", "#004d40"],
    I: ["#c8e6c9", "#1b5e20"],
    J: ["#dcedc8", "#33691e"],
    K: ["#f0f4c3", "#827717"],
    L: ["#fff9c4", "#f57f17"],
    M: ["#ffe0b2", "#bf360c"],
    N: ["#cfd8dc", "#37474f"],
    O: ["#ffccbc", "#d84315"],
    P: ["#d7ccc8", "#3e2723"],
    Q: ["#cfd8dc", "#263238"],
    R: ["#ffcdd2", "#b71c1c"],
    S: ["#f8bbd0", "#880e4f"],
    T: ["#e1bee7", "#4a148c"],
    U: ["#c5cae9", "#1a237e"],
    V: ["#bbdefb", "#0d47a1"],
    W: ["#b2ebf2", "#006064"],
    X: ["#b2dfdb", "#004d40"],
    Y: ["#fffde7", "#827717"],
    Z: ["#f1f8e9", "#1b5e20"],
  };

  const getInitials = (fullName) => {
    if (!fullName || fullName.trim().length === 0) {
      return null; // Return null instead of "?" to show icon
    }

    const parts = fullName.trim().split(/\s+/);
    let initials = parts[0][0];

    if (parts.length > 1) {
      initials += parts[1][0];
    }

    return initials.toUpperCase();
  };

  const getColors = (fullName) => {
    if (!fullName || fullName.trim().length === 0) {
      return ["#d1c4e9", "#311b92"]; // Default colors
    }

    const firstChar = fullName.trim()[0].toUpperCase();
    return colorMap[firstChar] || ["#d1c4e9", "#311b92"];
  };

  const initials = getInitials(name);
  const [bgColor, textColor] = getColors(name);

  return (
    <div
      className={`${size} rounded-full font-bold ${textSize} ${className}`}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        lineHeight: "1",
      }}
    >
      {initials ? (
        <span style={{ userSelect: "none" }}>{initials}</span>
      ) : (
        <LuUser className="w-10 h-10" />
      )}
    </div>
  );
};

export default Avatar;
