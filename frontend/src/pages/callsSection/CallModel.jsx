import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import {
  FaMicrophone as Mic,
  FaMicrophoneSlash as MicOff,
  FaVideo as VideoIcon,
  FaVideoSlash as VideoOff,
  FaPhoneSlash as PhoneOff,
  FaDesktop as MonitorUp,
  FaRegWindowRestore as PictureInPicture2,
  FaExpand,
  FaCompress,
} from "react-icons/fa";
import useCallingStore from "../../store/useCallingStore";
import useUserStore from "../../store/useUserStore";
import Avatar from "../../components/Avatar";
import mediaService from "../../services/mediaService";
import WindowedCallUI from "./WindowedCallUI";

const CallModel = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const {
    currentCall,
    incomingCall,
    isCallActive,
    callType,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
    isRemoteVideoEnabled,
    isRemoteAudioEnabled,
    peerConnection,
    isCallModelOpen,
    callStatus,
    setIncomingCall,
    setCurrentCall,
    setIsCallModelOpen,
    endCall,
    setCallStatus,
    setIsCallActive,
    setLocalStream,
    setRemoteStream,
    setPeerConnection,
    addIceCandidate,
    processQueuedIceCandidates,
    toggleVideo,
    toggleAudio,
    clearIncomingCall,
    setIsRemoteVideoEnabled,
    setIsRemoteAudioEnabled,
  } = useCallingStore();

  const { user } = useUserStore();

  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.l.google.com:5349" },
      { urls: "stun:stun1.l.google.com:3478" },
      { urls: "stun:stun1.l.google.com:5349" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:5349" },
      { urls: "stun:stun3.l.google.com:3478" },
      { urls: "stun:stun3.l.google.com:5349" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:5349" },
    ],
  };

  // Memoized display info for call participants
  const displayInfo = useMemo(() => {
    if (incomingCall && !isCallActive) {
      return {
        name: incomingCall.callerName,
        avatar: incomingCall.callerAvatar,
      };
    } else if (currentCall) {
      return {
        name: currentCall.participantName,
        avatar: currentCall.participantAvatar,
      };
    }
    return { name: "Unknown", avatar: null };
  }, [incomingCall, currentCall, isCallActive]);

  // Setup PiP on mount
  useEffect(() => {
    setPipSupported(Boolean(document.pictureInPictureEnabled));

    // PiP event listeners on document
    const onEnter = () => setIsPiPActive(true);
    const onLeave = () => setIsPiPActive(false);
    document.addEventListener("enterpictureinpicture", onEnter);
    document.addEventListener("leavepictureinpicture", onLeave);

    return () => {
      document.removeEventListener("enterpictureinpicture", onEnter);
      document.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, []);

  //connection detection
  useEffect(() => {
    if (peerConnection && remoteStream) {
      console.log("both peer connection and remote stream are available");
      setCallStatus("connected");
      setIsCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallStatus, setIsCallActive]);

  // set up local video stream when localStream changes or video is toggled
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled]);

  // set up remote video stream when remoteStream changes or remote video is toggled
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isRemoteVideoEnabled, isFullscreen]);

  // Track call start time without using React state to avoid re-renders/flicker.
  const callStartRef = useRef(null);

  const formatElapsed = (ms) => {
    if (!ms || ms < 0) return "00:00";
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // getCallDuration kept out of render to avoid accidental usage causing re-renders;
  // use <span data-call-duration> for live updates handled by effect above.

  // Update callStartRef when call status changes and update DOM nodes directly
  useEffect(() => {
    let interval = null;

    const updateAllDurationNodes = () => {
      const text = callStartRef.current
        ? formatElapsed(Date.now() - callStartRef.current)
        : "00:00";
      document.querySelectorAll("[data-call-duration]").forEach((el) => {
        if (el && el.innerText !== text) el.innerText = text;
      });
    };

    if (callStatus === "connected") {
      // start timer if not already started
      if (!callStartRef.current) callStartRef.current = Date.now();
      // immediate update and then every second
      updateAllDurationNodes();
      interval = setInterval(updateAllDurationNodes, 1000);
    } else {
      // stop timer and reset
      callStartRef.current = null;
      // Ensure nodes show initial value (status text will be used elsewhere)
      document.querySelectorAll("[data-call-duration]").forEach((el) => {
        if (el) el.innerText = "00:00";
      });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
    // only care when call status changes
  }, [callStatus]);

  //initialize media stream using shared media service
  const initializeMedia = async (video = true) => {
    try {
      console.log(
        "🎥 FRONTEND: Requesting media access via MediaService, video:",
        video
      );

      const constraints = {
        video: video ? { width: 640, height: 480 } : false,
        audio: true,
      };

      const { stream, streamId } = await mediaService.getMediaStream(
        constraints
      );

      // Store the streamId for later cleanup
      if (localVideoRef.current) {
        localVideoRef.current.streamId = streamId;
      }

      console.log(
        "🎥 FRONTEND: Media stream obtained via MediaService, tracks:",
        stream.getTracks().map((t) => t.kind)
      );

      console.log(
        "📹 FRONTEND: MediaService info:",
        mediaService.getStreamInfo()
      );

      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error(
        "🔴 FRONTEND: Error initializing media via MediaService:",
        error
      );

      // Enhanced error handling with fallbacks
      if (error.name === "NotReadableError") {
        console.error("🔴 FRONTEND: Device is busy, trying fallback...");
        try {
          // Try audio-only as fallback
          const { stream } = await mediaService.getMediaStream({
            video: false,
            audio: true,
          });
          setLocalStream(stream);
          return stream;
        } catch (fallbackError) {
          console.error(
            "🔴 FRONTEND: Audio fallback also failed:",
            fallbackError
          );
        }
      }

      return null;
    }
  };

  //create peer connection
  const createPeerConnection = (stream, role) => {
    console.log(`🔗 FRONTEND: [${role}] Creating peer connection`);
    const pc = new RTCPeerConnection(rtcConfig);

    //add local stream tracks immediately
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(
          `🔗 FRONTEND: [${role}] Adding ${track.kind} track:`,
          track.id.slice(0, 8)
        );
        pc.addTrack(track, stream);
      });
    }

    //handle ice candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        const participantId =
          currentCall?.participantId || incomingCall?.callerId;
        const callId = currentCall?.callId || incomingCall?.callId;

        if (participantId && callId) {
          console.log(
            `🧊 FRONTEND: [${role}] Sending ICE candidate to:`,
            participantId
          );
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      console.log(
        `📺 FRONTEND: [${role}] Received remote track:`,
        event.track.kind
      );
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(
        `🔗 FRONTEND: [${role}] Connection state:`,
        pc.connectionState
      );
      if (pc.connectionState === "connected") {
        console.log("✅ FRONTEND: Peer connection established");
      } else if (pc.connectionState === "disconnected") {
        console.log("⚠️ FRONTEND: Peer connection disconnected");
      } else if (pc.connectionState === "failed") {
        console.error("🔴 FRONTEND: Peer connection failed");
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(
        `🧊 FRONTEND: [${role}] ICE connection state:`,
        pc.iceConnectionState
      );
    };

    pc.onsignalingstatechange = () => {
      console.log(`📡 FRONTEND: [${role}] Signaling state:`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  //caller : Initialize call after acceptance
  const initializeCallerCall = async () => {
    try {
      console.log("🔵 FRONTEND: [CALLER] Initializing caller call");
      setCallStatus("calling");

      console.log(
        "🔵 FRONTEND: [CALLER] Getting media stream, video:",
        callType === "video"
      );
      const stream = await initializeMedia(callType === "video");

      if (!stream) {
        console.error("🔴 FRONTEND: [CALLER] Failed to get media stream");
        return;
      }

      console.log("🔵 FRONTEND: [CALLER] Creating peer connection");
      //create peer connection
      const pc = createPeerConnection(stream, "CALLER");

      console.log("🔵 FRONTEND: [CALLER] Creating offer");
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });

      console.log("🔵 FRONTEND: [CALLER] Setting local description");
      await pc.setLocalDescription(offer);

      console.log(
        "🔵 FRONTEND: [CALLER] Emitting webrtc_offer to:",
        currentCall?.participantId
      );
      socket.emit("webrtc_offer", {
        offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      console.error(
        "🔴 FRONTEND: [CALLER] Error initializing caller call:",
        error
      );
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000);
    }
  };

  //receiver: answer call
  const handleAnswerCall = async () => {
    try {
      console.log("🟢 FRONTEND: [RECEIVER] Answering call");
      setCallStatus("ringing");

      console.log(
        "🟢 FRONTEND: [RECEIVER] Getting media stream, video:",
        callType === "video"
      );
      const stream = await initializeMedia(callType === "video");

      if (!stream) {
        console.error("🔴 FRONTEND: [RECEIVER] Failed to get media stream");
        return;
      }

      console.log("🟢 FRONTEND: [RECEIVER] Creating peer connection");
      //create peer connection and wait for offer
      createPeerConnection(stream, "RECEIVER");

      console.log(
        "🟢 FRONTEND: [RECEIVER] Emitting accept_call to:",
        incomingCall.callerId
      );
      socket.emit("accept_call", {
        callerId: incomingCall.callerId,
        callId: incomingCall.callId,
        receiverInfo: {
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
      });

      setCurrentCall({
        callId: incomingCall.callId,
        participantId: incomingCall.callerId,
        participantName: incomingCall.callerName,
        participantAvatar: incomingCall.callerAvatar,
      });

      clearIncomingCall();
      console.log(
        "🟢 FRONTEND: [RECEIVER] Waiting for WebRTC offer from caller..."
      );
    } catch (error) {
      console.error("🔴 FRONTEND: [RECEIVER] Error answering call:", error);
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000); // Delay to show the reason
    }
  };

  const handleRejectCall = () => {
    if (incomingCall) {
      socket.emit("reject_call", {
        callerId: incomingCall.callerId,
        callId: incomingCall.callId,
      });
      endCall();
    }
  };

  const handleEndCall = () => {
    console.log("📞 FRONTEND: Ending call and cleaning up resources");

    // Close peer connection
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
    }

    // Clean up local stream by releasing it from the media service
    if (
      localStream &&
      localVideoRef.current &&
      localVideoRef.current.streamId
    ) {
      console.log("🎥 FRONTEND: Releasing local stream from call");
      mediaService.releaseStream(localVideoRef.current.streamId);
      localVideoRef.current.streamId = null;
      setLocalStream(null);
    }

    if (remoteStream) {
      console.log("📺 FRONTEND: Cleaning up remote stream");
      setRemoteStream(null);
    }

    setIsCallActive(false);
    setCallStatus("ended");

    if (socket) {
      socket.emit("end_call", {
        callId: currentCall?.callId || incomingCall?.callId,
        participantId: currentCall?.participantId || incomingCall?.callerId,
      });
    }

    endCall();
    setCurrentCall(null);
    setIncomingCall(null);
    setIsCallModelOpen(false);

    console.log(
      "📹 FRONTEND: MediaService info after call end:",
      mediaService.getStreamInfo()
    );
  };

  // Screen share functionality
  const toggleShare = async () => {
    if (!isSharing) {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        // Replace video track in peer connection
        if (peerConnection && localStream) {
          const videoTrack = screen.getVideoTracks()[0];
          const sender = peerConnection
            .getSenders()
            .find((s) => s.track && s.track.kind === "video");
          if (sender) {
            await sender.replaceTrack(videoTrack);
          }
        }

        setIsSharing(true);

        // When the user stops sharing, revert back to camera
        screen.getVideoTracks()[0].addEventListener("ended", async () => {
          if (peerConnection && localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            const sender = peerConnection
              .getSenders()
              .find((s) => s.track && s.track.kind === "video");
            if (sender && videoTrack) {
              await sender.replaceTrack(videoTrack);
            }
          }
          setIsSharing(false);
        });
      } catch (e) {
        console.warn("Screen share cancelled", e);
      }
    } else {
      // Revert to camera
      if (peerConnection && localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        const sender = peerConnection
          .getSenders()
          .find((s) => s.track && s.track.kind === "video");
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
      }
      setIsSharing(false);
    }
  };

  // Enter PiP on the REMOTE video
  const enterPiP = async () => {
    try {
      if (!pipSupported) return;
      const el = remoteVideoRef.current;
      if (el && !document.pictureInPictureElement) {
        await el.play();
        await el.requestPictureInPicture();
      }
    } catch (err) {
      console.error("Failed to enter PiP:", err);
    }
  };

  const exitPiP = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch (err) {
      console.error("Failed to exit PiP:", err);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  //socket event listners
  useEffect(() => {
    if (!socket) return;

    //call accepted start caller flow
    const handleCallAccepted = () => {
      console.log("🔵 FRONTEND: [CALLER] Call accepted, starting caller flow");
      if (currentCall) {
        setTimeout(() => {
          initializeCallerCall();
        }, 500);
      }
    };
    const handleCallRejected = () => {
      console.log("🔴 FRONTEND: Call rejected");
      setCallStatus("rejected");
      setTimeout(endCall, 2000);
    };

    const handleCallEnded = () => {
      console.log("📞 FRONTEND: Call ended by other participant");
      endCall();
    };

    const handleMediaStatusChange = ({ type, enabled }) => {
      console.log(
        `[MEDIA STATUS] Received status change: ${type} -> ${enabled}`
      );
      if (type === "video") {
        setIsRemoteVideoEnabled(enabled);
      } else if (type === "audio") {
        setIsRemoteAudioEnabled(enabled);
      }
    };

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      console.log(
        "🟢 FRONTEND: [RECEIVER] Received WebRTC offer from:",
        senderId
      );
      if (!peerConnection) return;

      if (peerConnection.signalingState !== "stable") {
        console.warn(
          `🟡 FRONTEND: [RECEIVER] Received offer in non-stable state: ${peerConnection.signalingState}. Ignoring.`
        );
        return;
      }

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        console.log(
          "🟢 FRONTEND: [RECEIVER] Remote description set, processing queued ICE candidates"
        );
        await processQueuedIceCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        console.log("🟢 FRONTEND: [RECEIVER] Sending answer to:", senderId);
        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });

        console.log("🟢 FRONTEND: [RECEIVER] Answer sent to caller:", senderId);
      } catch (error) {
        console.error(
          "🔴 FRONTEND: [RECEIVER] Error handling WebRTC offer:",
          error
        );
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    //Receiver answer (caller)
    const handleWebRTCAnswer = async ({ answer, senderId }) => {
      console.log(
        "🔵 FRONTEND: [CALLER] Received WebRTC answer from:",
        senderId
      );
      if (!peerConnection) return;

      if (peerConnection.signalingState === "closed") {
        console.warn(
          "🟡 FRONTEND: [CALLER] Peer connection is closed, cannot set answer"
        );
        return;
      }

      try {
        console.log(
          "🔵 FRONTEND: [CALLER] Setting remote description with answer"
        );
        // current caller signaling
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        console.log("🔵 FRONTEND: [CALLER] Processing queued ICE candidates");
        // Process any queued ICE candidates
        await processQueuedIceCandidates(peerConnection);

        //check receiver
        const receivers = peerConnection.getReceivers();
        console.log("🔵 FRONTEND: [CALLER] Receivers:", receivers);
      } catch (error) {
        console.error(
          "🔴 FRONTEND: [CALLER] Error handling WebRTC answer:",
          error
        );
        setTimeout(handleEndCall, 2000);
      }
    };

    //Receiver ICE candidate
    const handleWebRTCIceCandidates = async ({ candidate, senderId }) => {
      console.log("🧊 FRONTEND: Received ICE candidate from:", senderId);
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("🧊 FRONTEND: ICE candidate added successfully");
          } catch (error) {
            console.error("🔴 FRONTEND: Error adding ICE candidate:", error);
          }
        }
      } else {
        console.log("🧊 FRONTEND: Queuing ICE candidate:", candidate);
        addIceCandidate(candidate);
      }
    };

    //register all event listeners
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("media_status_change", handleMediaStatusChange);
    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidates);

    console.log("Socket event listeners registered");
    return () => {
      //unregister all event listeners
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("media_status_change", handleMediaStatusChange);
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidates);

      console.log("Socket event listeners unregistered");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socket,
    peerConnection,
    currentCall,
    incomingCall,
    setPeerConnection,
    setRemoteStream,
    setLocalStream,
    setIsCallActive,
    setCallStatus,
    endCall,
    processQueuedIceCandidates,
    addIceCandidate,
    setIsRemoteAudioEnabled,
    setIsRemoteVideoEnabled,
  ]); // handleEndCall and initializeCallerCall intentionally omitted to prevent infinite re-renders

  if (!isCallModelOpen && !incomingCall && !currentCall) return null;

  const isVideoCall = callType === "video";

  // Show incoming call screen
  if (incomingCall && !isCallActive) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-gray-900 rounded-2xl p-8 text-center text-white max-w-md w-full mx-4">
          <div className="w-32 h-32 mx-auto mb-4">
            {displayInfo.avatar ? (
              <img
                src={displayInfo.avatar}
                alt={displayInfo.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <Avatar
                name={displayInfo.name}
                size="w-32 h-32"
                textSize="text-4xl"
              />
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">{displayInfo.name}</h2>
          <p className="text-gray-400 mb-8">
            Incoming {isVideoCall ? "video" : "voice"} call...
          </p>
          <div className="flex justify-center gap-8">
            <button
              onClick={handleAnswerCall}
              className="bg-green-600 hover:bg-green-500 p-4 rounded-full text-white transform hover:scale-110 transition-all"
            >
              <VideoIcon size={24} />
            </button>
            <button
              onClick={handleRejectCall}
              className="bg-red-600 hover:bg-red-500 p-4 rounded-full text-white transform hover:scale-110 transition-all"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main call interface
  if (!isFullscreen) {
    // Use the new windowed call UI
    return (
      <WindowedCallUI
        displayInfo={displayInfo}
        callStatus={callStatus}
        isVideoCall={isVideoCall}
        isRemoteVideoEnabled={isRemoteVideoEnabled}
        remoteStream={remoteStream}
        isVideoEnabled={isVideoEnabled}
        localStream={localStream}
        isAudioEnabled={isAudioEnabled}
        isRemoteAudioEnabled={isRemoteAudioEnabled}
        localName={user?.username}
        localAvatar={user?.profilePicture}
        onToggleAudio={() => toggleAudio(socket)}
        onToggleVideo={() => toggleVideo(socket)}
        onEndCall={handleEndCall}
        onToggleFullscreen={toggleFullscreen}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />
    );
  }

  // Fullscreen call interface
  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex overflow-hidden shadow-2xl">
      {/* Main call stage */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Remote video full-bleed */}
        {isVideoCall && isRemoteVideoEnabled && remoteStream ? (
          <video
            ref={(el) => {
              remoteVideoRef.current = el;
              if (el && remoteStream) {
                el.srcObject = remoteStream;
              }
            }}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900">
            <div className="w-32 h-32 mb-4">
              {displayInfo.avatar ? (
                <img
                  src={displayInfo.avatar}
                  alt={displayInfo.name}
                  className="w-32 h-32 rounded-full object-cover"
                />
              ) : (
                <Avatar
                  name={displayInfo.name}
                  size="w-32 h-32"
                  textSize="text-4xl"
                />
              )}
            </div>
            <h2 className="text-2xl font-bold mb-2">{displayInfo.name}</h2>
            <p className="text-gray-400 text-base">
              {callStatus === "calling" ? (
                "Calling..."
              ) : callStatus === "connected" ? (
                <span data-call-duration>00:00</span>
              ) : callStatus === "rejected" ? (
                "Call rejected"
              ) : callStatus === "failed" ? (
                "Call failed"
              ) : callStatus === "ended" ? (
                "Call ended"
              ) : (
                callStatus
              )}
            </p>
          </div>
        )}

        {/* Gradient mask for bottom controls readability */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {/* Remote Participant's Status Indicators */}
        {isCallActive && (
          <div className="absolute top-4 right-4 flex items-center gap-2 text-white z-10">
            {!isRemoteAudioEnabled && (
              <div
                className="bg-red-600 bg-opacity-70 p-2 rounded-full"
                title={`${displayInfo.name} muted their audio`}
              >
                <MicOff size={16} />
              </div>
            )}
            {isVideoCall && !isRemoteVideoEnabled && (
              <div
                className="bg-red-600 bg-opacity-70 p-2 rounded-full"
                title={`${displayInfo.name} turned off their camera`}
              >
                <VideoOff size={16} />
              </div>
            )}
          </div>
        )}

        {/* Local self-view (bottom-right) */}
        {isVideoCall && (
          <Motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-28 right-6 w-52 aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black/30 backdrop-blur"
          >
            <video
              ref={(el) => {
                localVideoRef.current = el;
                if (el && localStream) {
                  el.srcObject = localStream;
                }
              }}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover scale-x-[-1] transition-opacity duration-200 ${
                isVideoEnabled && localStream ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* Fallback avatar when local preview not available */}
            {!(isVideoEnabled && localStream) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Avatar
                  name={user?.username || "You"}
                  size="w-24 h-24"
                  textSize="text-lg"
                />
              </div>
            )}
          </Motion.div>
        )}

        {/* Call Info for Video */}
        {isVideoCall && remoteStream && (
          <div className="absolute top-4 left-4 text-white z-10">
            <p className="font-bold text-lg">{displayInfo.name}</p>
            <p className="text-sm opacity-80">
              {callStatus === "connected" ? (
                <span data-call-duration>00:00</span>
              ) : (
                callStatus
              )}
            </p>
          </div>
        )}

        {/* Controls bar */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center">
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <IconButton
              active={isAudioEnabled}
              onClick={() => toggleAudio(socket)}
              label={isAudioEnabled ? "Mute" : "Unmute"}
              size="normal"
            >
              {isAudioEnabled ? <Mic /> : <MicOff />}
            </IconButton>

            {isVideoCall && (
              <IconButton
                active={isVideoEnabled}
                onClick={() => toggleVideo(socket)}
                label={isVideoEnabled ? "Stop video" : "Start video"}
                size="normal"
              >
                {isVideoEnabled ? <VideoIcon /> : <VideoOff />}
              </IconButton>
            )}

            <IconButton
              active={isSharing}
              onClick={toggleShare}
              label={isSharing ? "Stop share" : "Share screen"}
            >
              <MonitorUp />
            </IconButton>

            <IconButton
              disabled={!pipSupported}
              onClick={enterPiP}
              label={pipSupported ? "Picture in Picture" : "PiP not supported"}
            >
              <PictureInPicture2 />
            </IconButton>

            <IconButton
              onClick={toggleFullscreen}
              label="Minimize call"
              size="normal"
            >
              <FaCompress />
            </IconButton>

            <button
              onClick={handleEndCall}
              className="ml-1 px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition shadow-lg flex items-center gap-2"
              aria-label="Hang up"
              title="Hang up"
            >
              <PhoneOff size={16} />
              <span className="text-sm font-medium">Leave</span>
            </button>
          </div>
        </div>

        {/* Meet-like overlay while in PiP */}
        <AnimatePresence>
          {isPiPActive && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="mx-6 max-w-3xl w-full rounded-2xl bg-[#1E1F22] text-white p-8 md:p-10 shadow-2xl border border-white/10">
                <div className="flex flex-col items-center text-center gap-6">
                  <PiPIllustration />
                  <div>
                    <h2 className="text-2xl md:text-3xl font-semibold">
                      Your call is in another window
                    </h2>
                    <p className="text-white/70 mt-2">
                      Using Picture-in-Picture lets you stay in the call while
                      you do other things.
                    </p>
                  </div>
                  <button
                    onClick={exitPiP}
                    className="px-5 py-2.5 rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] transition font-medium shadow"
                  >
                    Bring the call back here
                  </button>
                </div>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// IconButton component
function IconButton({
  children,
  onClick,
  label,
  active = false,
  disabled = false,
  size = "normal",
}) {
  const sizeClasses = size === "small" ? "h-8 w-8" : "h-11 w-11";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative ${sizeClasses} rounded-full grid place-items-center border transition active:scale-95 shadow hover:shadow-md 
        ${
          disabled
            ? "opacity-40 cursor-not-allowed border-white/10 bg-white/5"
            : "cursor-pointer"
        }
        ${
          active
            ? "bg-white text-black border-white"
            : "bg-black/50 text-white border-white/20 hover:bg-white/10"
        }`}
      aria-label={label}
      title={label}
    >
      <div className="scale-100 group-active:scale-95 transition-transform">
        {React.cloneElement(children, { size: size === "small" ? 12 : 16 })}
      </div>
    </button>
  );
}

// PiP Illustration component
function PiPIllustration() {
  // Simple decorative illustration similar to Meet's placeholder
  return (
    <svg
      width="220"
      height="120"
      viewBox="0 0 220 120"
      xmlns="http://www.w3.org/2000/svg"
      className="text-white/20"
    >
      <rect
        x="10"
        y="10"
        width="200"
        height="100"
        rx="12"
        fill="currentColor"
        opacity="0.15"
      />
      <rect
        x="145"
        y="65"
        width="55"
        height="35"
        rx="8"
        fill="currentColor"
        opacity="0.35"
      />
      <circle
        cx="50"
        cy="60"
        r="18"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        opacity="0.4"
      />
      <path
        d="M40 82c8-8 24-8 32 0"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        opacity="0.4"
      />
    </svg>
  );
}

export default CallModel;
