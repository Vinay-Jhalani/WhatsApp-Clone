import React, { useEffect, useRef } from "react";
import { motion as Motion } from "framer-motion";
import {
  FaExpand,
  FaCompress,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
} from "react-icons/fa";

const WindowedCallUI = ({
  displayInfo,
  callStatus,
  getCallDuration,
  isVideoCall,
  isRemoteVideoEnabled,
  remoteStream,
  isVideoEnabled,
  localStream,
  isAudioEnabled,
  isRemoteAudioEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onToggleFullscreen,
  localVideoRef,
  remoteVideoRef,
}) => {
  // Internal refs as fallback if none provided
  const internalRemoteRef = useRef(null);
  const internalLocalRef = useRef(null);

  useEffect(() => {
    // Keep video floating above everything, even when tab is not focused
    const container = document.getElementById("floating-call-ui");
    if (container) {
      container.style.position = "fixed";
      container.style.zIndex = 50; // Reasonable z-index that won't interfere with other UI
      container.style.pointerEvents = "auto";
    }
  }, []);

  // Attach remote stream only when it changes to avoid flicker
  useEffect(() => {
    const el =
      (remoteVideoRef && remoteVideoRef.current) || internalRemoteRef.current;
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef]);

  // Attach local stream only when it changes to avoid flicker
  useEffect(() => {
    const el =
      (localVideoRef && localVideoRef.current) || internalLocalRef.current;
    if (el && localStream && el.srcObject !== localStream) {
      el.srcObject = localStream;
    }
  }, [localStream, localVideoRef]);

  return (
    <div
      id="floating-call-ui"
      className="fixed bottom-20 right-4 z-50 md:bottom-4"
    >
      <Motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        className="relative bg-black rounded-2xl shadow-lg overflow-hidden flex flex-col items-center justify-center w-[320px] h-[480px]"
        layout={false}
        initial={false}
        transition={{ type: "tween", duration: 0 }}
      >
        {/* Main Area: keep video mounted, toggle visibility to avoid remount flicker */}
        <div className="absolute inset-0">
          <video
            ref={(el) => {
              if (remoteVideoRef) {
                remoteVideoRef.current = el;
              } else {
                internalRemoteRef.current = el;
              }
            }}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${
              isVideoCall && isRemoteVideoEnabled && remoteStream
                ? "opacity-100"
                : "opacity-0"
            }`}
          />

          {/* Placeholder layer when remote video not visible */}
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center bg-gray-900 ${
              isVideoCall && isRemoteVideoEnabled && remoteStream
                ? "opacity-0 pointer-events-none"
                : "opacity-100"
            }`}
          >
            <div className="w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4">
              {displayInfo.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <h2 className="text-lg font-bold mb-2 text-white">
              {displayInfo.name}
            </h2>
            <p className="text-gray-400 text-sm">
              {callStatus === "calling"
                ? "Calling..."
                : callStatus === "connected"
                ? getCallDuration()
                : callStatus === "rejected"
                ? "Call rejected"
                : callStatus === "failed"
                ? "Call failed"
                : callStatus === "ended"
                ? "Call ended"
                : callStatus}
            </p>
          </div>
        </div>

        {/* Remote Participant's Status Indicators */}
        <div className="absolute top-4 right-4 flex items-center gap-2 text-white z-10">
          {!isRemoteAudioEnabled && (
            <div
              className="bg-red-600 bg-opacity-70 p-2 rounded-full"
              title={`${displayInfo.name} muted their audio`}
            >
              <FaMicrophoneSlash size={12} />
            </div>
          )}
          {isVideoCall && !isRemoteVideoEnabled && (
            <div
              className="bg-red-600 bg-opacity-70 p-2 rounded-full"
              title={`${displayInfo.name} turned off their camera`}
            >
              <FaVideoSlash size={12} />
            </div>
          )}
        </div>

        {/* Local Video Preview */}
        {/* Local Video Preview: keep mounted and hide when not needed */}
        <div className="absolute bottom-20 right-4 w-24 h-32 max-w-[30%] max-h-[30%] rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={(el) => {
              if (localVideoRef) {
                localVideoRef.current = el;
              } else {
                internalLocalRef.current = el;
              }
            }}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] ${
              isVideoCall && isVideoEnabled && localStream
                ? "opacity-100"
                : "opacity-0"
            }`}
          />
        </div>

        {/* Call Info */}
        {isVideoCall && remoteStream && (
          <div className="absolute top-3 left-4 text-white z-10">
            <p className="font-bold text-sm">{displayInfo.name}</p>
            <p className="text-xs opacity-80">
              {callStatus === "connected" ? getCallDuration() : callStatus}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-0 w-full flex items-center justify-center gap-2 px-4">
          <button
            onClick={onToggleAudio}
            className={`p-2 rounded-full text-white transition ${
              isAudioEnabled
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-500"
            }`}
            title={isAudioEnabled ? "Mute" : "Unmute"}
          >
            {isAudioEnabled ? (
              <FaMicrophone size={14} />
            ) : (
              <FaMicrophoneSlash size={14} />
            )}
          </button>

          {isVideoCall && (
            <button
              onClick={onToggleVideo}
              className={`p-2 rounded-full text-white transition ${
                isVideoEnabled
                  ? "bg-gray-700 hover:bg-gray-600"
                  : "bg-red-600 hover:bg-red-500"
              }`}
              title={isVideoEnabled ? "Stop video" : "Start video"}
            >
              {isVideoEnabled ? (
                <FaVideo size={14} />
              ) : (
                <FaVideoSlash size={14} />
              )}
            </button>
          )}

          <button
            onClick={onEndCall}
            className="bg-red-600 hover:bg-red-500 p-2 rounded-full text-white transition"
            title="Hang up"
          >
            <FaPhoneSlash size={14} />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="bg-gray-700 hover:bg-gray-600 p-2 rounded-full text-white transition"
            title="Maximize call"
          >
            <FaExpand size={14} />
          </button>
        </div>
      </Motion.div>
    </div>
  );
};

export default WindowedCallUI;
