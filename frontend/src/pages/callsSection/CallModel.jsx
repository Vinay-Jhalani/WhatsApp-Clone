import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FaExpand,
  FaCompress,
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
} from "react-icons/fa";
import useCallingStore from "../../store/useCallingStore";
import useUserStore from "../../store/useUserStore";

const CallModel = ({ socket }) => {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    currentCall,
    incomingCall,
    isCallActive,
    callType,
    localStream,
    remoteStream,
    isVideoEnabled,
    isAudioEnabled,
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

  //connection detection
  useEffect(() => {
    if (peerConnection && remoteStream) {
      console.log("both peer connection and remote stream are available");
      setCallStatus("connected");
      setIsCallActive(true);
    }
  }, [peerConnection, remoteStream, setCallStatus, setIsCallActive]);

  // set up local video stream when localStream change
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // set up local video stream when remoteStream change
  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  //initialize media stream
  const initializeMedia = async (video = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video ? { width: 640, height: 480 } : false,
        audio: true,
      });
      console.log("Local media stream", stream.getTracks());
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error("Error initializing media:", error);
      return null;
    }
  };

  //create peer connection
  const createPeerConnection = (stream, role) => {
    const pc = new RTCPeerConnection(rtcConfig);

    //add local stream tracks immediately
    if (stream) {
      stream.getTracks().forEach((track) => {
        console.log(`${role} adding ${track.kind} track`, track.id.slice(0, 8));
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
          socket.emit("webrtc_ice_candidate", {
            candidate: event.candidate,
            receiverId: participantId,
            callId: callId,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const stream = new MediaStream([event.track]);
        setRemoteStream(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        console.log("Peer connection established");
      } else if (pc.connectionState === "disconnected") {
        console.log("Peer connection disconnected");
      } else if (pc.connectionState === "failed") {
        console.error("Peer connection failed");
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`${role} ICE connection state:`, pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log(`${role} signaling state:`, pc.signalingState);
    };

    setPeerConnection(pc);
    return pc;
  };

  //caller : Initialize call after acceptance
  const initializeCallerCall = async () => {
    try {
      setCallStatus("calling");

      const stream = await initializeMedia(callType === "video");

      //create peer connection
      const pc = createPeerConnection(stream, "CALLER");

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === "video",
      });

      await pc.setLocalDescription(offer);

      socket.emit("webrtc_offer", {
        offer,
        receiverId: currentCall?.participantId,
        callId: currentCall?.callId,
      });
    } catch (error) {
      console.error("Error initializing caller call:", error);
      setCallStatus("failed");
      setTimeout(handleEndCall, 2000);
    }
  };

  //receiver: answer call

  const handleAnswerCall = async () => {
    try {
      setCallStatus("ringing");

      const stream = await initializeMedia(callType === "video");

      //create peer connection
      const pc = createPeerConnection(stream, "RECEIVER");

      //set remote description
      await pc.setRemoteDescription(incomingCall.offer);

      //create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

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
    } catch (error) {
      console.error("Error answering call:", error);
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
    if (peerConnection) {
      peerConnection.close();
      setPeerConnection(null);
      setRemoteStream(null);
      setLocalStream(null);
      setIsCallActive(false);
      setCallStatus("ended");
    }
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
  };

  //socket event listners
  useEffect(() => {
    if (!socket) return;

    //call accepted start caller flow
    const handleCallAccepted = ({ offer, receiverId, callId }) => {
      if (currentCall) {
        setTimeout(() => {
          initializeCallerCall();
        }, 500);
      }
    };
    const handleCallRejected = () => {
      console.log("Call rejected:");
      setCallStatus("rejected");
      setTimeout(endCall, 2000);
    };

    const handleCallEnded = () => {
      endCall();
    };

    const handleWebRTCOffer = async ({ offer, senderId, callId }) => {
      if (!peerConnection) return;

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        await processQueuedIceCandidates(peerConnection);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("webrtc_answer", {
          answer,
          receiverId: senderId,
          callId,
        });

        console.log("Receiver: Answer sent to caller:", senderId);
      } catch (error) {
        console.error("Error handling WebRTC offer:", error);
        setCallStatus("failed");
        setTimeout(handleEndCall, 2000);
      }
    };

    //Receiver answer (caller)
    const handleWebRTCAnswer = async ({ answer, senderId, callId }) => {
      if (!peerConnection) return;

      if (peerConnection.signalingState === "closed") {
        console.warn("Peer connection is closed, cannot set answer");
        return;
      }

      try {
        // current caller signaling
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(answer)
        );

        // Process any queued ICE candidates
        await processQueuedIceCandidates(peerConnection);

        //check receiver
        const receivers = peerConnection.getReceivers();
        console.log("Receivers:", receivers);
      } catch (error) {
        console.error("Error handling WebRTC answer:", error);
        setTimeout(handleEndCall, 2000);
      }
    };

    //Receiver ICE candidate
    const handleWebRTCIceCandidates = async ({ candidate, senderId }) => {
      if (peerConnection && peerConnection.signalingState !== "closed") {
        if (peerConnection.remoteDescription) {
          try {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
            console.log("ICE candidate added:", candidate);
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
      } else {
        console.log("queuing ice candidate:", candidate);
        addIceCandidate(candidate);
      }
    };

    //register all event listeners
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_rejected", handleCallRejected);
    socket.on("call_ended", handleCallEnded);
    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidates);

    console.log("Socket event listeners registered");
    return () => {
      //unregister all event listeners
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_rejected", handleCallRejected);
      socket.off("call_ended", handleCallEnded);
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidates);

      console.log("Socket event listeners unregistered");
    };
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
  ]);

  if (!isCallModelOpen && !incomingCall && !currentCall) return null;

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const isVideoCall = callType === "video";

  return (
    <div id="floating-call-ui" className="fixed bottom-4 right-4">
      <motion.div
        drag
        dragMomentum={false}
        dragElastic={0.1}
        className={`relative ${
          isVideoCall ? "bg-black" : "bg-gray-800"
        } rounded-2xl shadow-lg overflow-hidden flex flex-col items-center justify-center ${
          isExpanded ? "w-[640px] h-[480px]" : "w-[320px] h-[240px]"
        }`}
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Main Content */}
        {isVideoCall && isVideoEnabled ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-white">
            <div className="w-24 h-24 bg-gray-600 rounded-full flex items-center justify-center text-3xl font-bold">
              {displayInfo.name.charAt(0).toUpperCase()}
            </div>
            <p className="mt-4 font-bold">{displayInfo.name}</p>
            <p className="text-sm opacity-80">{callStatus}</p>
          </div>
        )}

        {/* Local video preview */}
        {isVideoCall && isVideoEnabled && localStream && (
          <div className="absolute bottom-20 right-4 w-24 h-32 max-w-[30%] max-h-[30%] rounded-lg overflow-hidden border-2 border-white shadow-lg">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="object-cover w-full h-full"
            />
          </div>
        )}

        {/* Call Info for Video */}
        {isVideoCall && isVideoEnabled && (
          <div className="absolute top-3 left-0 w-full text-center text-white">
            <p className="font-bold">{displayInfo.name}</p>
            <p className="text-sm opacity-80">{callStatus}</p>
          </div>
        )}

        {/* Incoming call controls */}
        {incomingCall && !isCallActive && (
          <div className="absolute bottom-4 left-0 w-full flex items-center justify-center gap-4">
            <button
              onClick={handleAnswerCall}
              className="bg-green-600 hover:bg-green-500 p-3 rounded-full text-white"
            >
              <FaVideo />
            </button>
            <button
              onClick={handleRejectCall}
              className="bg-red-600 hover:bg-red-500 p-3 rounded-full text-white"
            >
              <FaPhoneSlash />
            </button>
          </div>
        )}

        {/* Active call controls */}
        {isCallActive && (
          <div className="absolute bottom-4 left-0 w-full flex items-center justify-center gap-4">
            <button
              onClick={toggleAudio}
              className="bg-gray-700 hover:bg-gray-600 p-3 rounded-full text-white"
            >
              {!isAudioEnabled ? <FaMicrophoneSlash /> : <FaMicrophone />}
            </button>

            {isVideoCall && (
              <button
                onClick={toggleVideo}
                className="bg-gray-700 hover:bg-gray-600 p-3 rounded-full text-white"
              >
                {!isVideoEnabled ? <FaVideoSlash /> : <FaVideo />}
              </button>
            )}

            <button
              onClick={handleEndCall}
              className="bg-red-600 hover:bg-red-500 p-3 rounded-full text-white"
            >
              <FaPhoneSlash />
            </button>

            <button
              onClick={toggleExpand}
              className="bg-gray-700 hover:bg-gray-600 p-3 rounded-full text-white"
            >
              {isExpanded ? <FaCompress /> : <FaExpand />}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default CallModel;
