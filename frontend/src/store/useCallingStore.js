import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

const useCallingStore = create(
  subscribeWithSelector((set, get) => ({
    //call states
    currentCall: null,
    incomingCall: null,
    isCallActive: false,
    callType: null, // "audio" or "video"

    //media states
    localStream: null,
    remoteStream: null,
    isVideoEnabled: true,
    isAudioEnabled: true,
    isRemoteVideoEnabled: true,
    isRemoteAudioEnabled: true,

    // webrtc
    peerConnection: null,
    iceCandidatesQueue: [], // queue for ICE candidates

    isCallModelOpen: false,
    callStatus: "idle", // "idle", "calling", "ringing", "connected", "ended"

    //Actions
    setCurrentCall: (call) => set({ currentCall: call }),
    setIncomingCall: (call) => set({ incomingCall: call }),
    setIsCallActive: (isActive) => set({ isCallActive: isActive }),
    setCallType: (type) => set({ callType: type }),
    setLocalStream: (stream) => set({ localStream: stream }),
    setRemoteStream: (stream) => set({ remoteStream: stream }),
    setIsVideoEnabled: (isEnabled) => set({ isVideoEnabled: isEnabled }),
    setIsAudioEnabled: (isEnabled) => set({ isAudioEnabled: isEnabled }),
    setIsRemoteVideoEnabled: (isEnabled) =>
      set({ isRemoteVideoEnabled: isEnabled }),
    setIsRemoteAudioEnabled: (isEnabled) =>
      set({ isRemoteAudioEnabled: isEnabled }),
    setPeerConnection: (pc) => set({ peerConnection: pc }),
    addIceCandidate: (candidate) =>
      set((state) => ({
        iceCandidatesQueue: [...state.iceCandidatesQueue, candidate],
      })),
    setIsCallModelOpen: (isOpen) => set({ isCallModelOpen: isOpen }),
    setCallStatus: (status) => set({ callStatus: status }),

    processQueuedIceCandidates: async () => {
      const { peerConnection, iceCandidatesQueue } = get();
      if (
        peerConnection &&
        peerConnection.remoteDescription &&
        iceCandidatesQueue.length > 0
      ) {
        for (const candidate of iceCandidatesQueue) {
          try {
            await peerConnection.addIceCandidate(candidate);
            new RTCIceCandidate(candidate);
          } catch (error) {
            console.error("Error adding ICE candidate:", error);
          }
        }
        set({ iceCandidatesQueue: [] }); // Clear
      }
    },

    toggleVideo: (socket) => {
      const { localStream, isVideoEnabled, peerConnection, currentCall } =
        get();
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !isVideoEnabled;
          set({ isVideoEnabled: !isVideoEnabled });
          // Notify the other user
          if (peerConnection && currentCall && socket) {
            socket.emit("media_status_change", {
              type: "video",
              enabled: !isVideoEnabled,
              receiverId: currentCall.participantId,
            });
          }
        }
      }
    },

    toggleAudio: (socket) => {
      const { localStream, isAudioEnabled, peerConnection, currentCall } =
        get();
      if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !isAudioEnabled;
          set({ isAudioEnabled: !isAudioEnabled });
          // Notify the other user
          if (peerConnection && currentCall && socket) {
            socket.emit("media_status_change", {
              type: "audio",
              enabled: !isAudioEnabled,
              receiverId: currentCall.participantId,
            });
          }
        }
      }
    },

    endCall: () => {
      const { peerConnection, localStream, remoteStream } = get();
      if (peerConnection) {
        peerConnection.close();
        set({
          currentCall: null,
          incomingCall: null,
          isCallActive: false,
          callType: null,
          localStream: null,
          remoteStream: null,
          isVideoEnabled: true,
          isAudioEnabled: true,
          peerConnection: null,
          iceCandidatesQueue: [],
          isCallModelOpen: false,
          callStatus: "ended",
        });
      }

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      if (remoteStream) {
        remoteStream.getTracks().forEach((track) => track.stop());
      }
    },
    clearIncomingCall: () => {
      set({ incomingCall: null });
    },
  }))
);

export default useCallingStore;
