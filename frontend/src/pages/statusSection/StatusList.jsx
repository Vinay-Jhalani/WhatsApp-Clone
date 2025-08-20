import React from "react";
import Avatar from "../../components/Avatar";
import formatTimestamp from "../../utils/formatTime";

const formatStatusPreview = (status) => {
  if (status.contentType !== "text") {
    return (
      status.contentType &&
      status.contentType.charAt(0).toUpperCase() + status.contentType.slice(1)
    );
  }

  const content = status.media || status.content || "Status";
  const singleLine = content.replace(/\n/g, " ");
  return singleLine.length > 30 ? singleLine.slice(0, 30) + "..." : singleLine;
};

const StatusList = ({ contact, onPreview, theme }) => {
  if (!contact) return null;

  // If contact has multiple statuses, render them as a list
  if (Array.isArray(contact.statuses) && contact.statuses.length > 0) {
    return (
      <div className="space-y-2">
        {contact.statuses.map((s, idx) => (
          <div
            key={s.id || s._id || idx}
            onClick={() => onPreview && onPreview(contact, idx)}
            className={`cursor-pointer flex items-center space-x-3 p-2 rounded ${
              theme === "dark" ? "hover:bg-gray-800" : "hover:bg-gray-100"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Avatar
                  name={contact.name || contact.id}
                  size="w-10 h-10"
                  textSize="text-sm"
                />
              )}
            </div>

            <div className="flex-1">
              <div className="font-medium">{contact.name || "Unknown"}</div>
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
    );
  }

  // Fallback single line summary
  return (
    <div
      onClick={() => onPreview && onPreview(contact)}
      className="cursor-pointer flex items-center space-x-3"
    >
      {contact.avatar ? (
        <img
          src={contact.avatar}
          alt={contact.name}
          className="w-10 h-10 rounded-full object-cover"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-lg font-bold">
          {contact.name?.[0] || "?"}
        </div>
      )}
      <div className="flex flex-col">
        <span className="font-semibold">{contact.name}</span>
        <span
          className={`text-xs ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {contact.statuses?.length || 0} status
          {(contact.statuses?.length || 0) > 1 ? "es" : ""}
        </span>
      </div>
    </div>
  );
};

export default StatusList;
