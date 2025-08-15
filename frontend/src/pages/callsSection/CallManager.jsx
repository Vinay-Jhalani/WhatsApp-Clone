import { useCallback, useEffect } from "react";
import useCallingStore from "../../store/useCallingStore";
import useUserStore from "../../store/useUserStore";
import CallModel from "./CallModel";

const CallManager = ({ socket }) => {
  const {
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setIsCallModelOpen,
    endCall,
    setCallStatus,
  } = useCallingStore();

  const { user } = useUserStore();

  useEffect(() => {
    if (!socket) return;

    //handle incoming call
    const handleIncomingCall = ({
      callerId,
      callerName,
      callerAvatar,
      callType,
      callId,
    }) => {
      console.log(
        "📱 FRONTEND: [MANAGER] Incoming call from:",
        callerName,
        "Type:",
        callType
      );
      setIncomingCall({ callerId, callerName, callerAvatar, callType, callId });
      setCallType(callType);
      setIsCallModelOpen(true);
      setCallStatus("ringing");
    };

    const handleCallEnded = ({ callId, reason }) => {
      console.log(
        "📞 FRONTEND: [MANAGER] Call ended, ID:",
        callId,
        "Reason:",
        reason
      );
      setCallStatus("ended");
      setTimeout(() => {
        endCall();
        setCurrentCall(null);
      }, 2000); // Delay to show the reason
    };

    socket.on("call_initiated", handleIncomingCall);
    socket.on("call_failed", handleCallEnded);

    return () => {
      socket.off("call_initiated", handleIncomingCall);
      socket.off("call_failed", handleCallEnded);
    };
  }, [
    socket,
    setIncomingCall,
    setCurrentCall,
    setCallType,
    setIsCallModelOpen,
    endCall,
    setCallStatus,
  ]);

  //Memoized function to initiate call
  const initiateCall = useCallback(
    ({ receiverId, receiverName, receiverAvatar, callType = "video" }) => {
      console.log(
        "📱 FRONTEND: [MANAGER] Initiating call to:",
        receiverName,
        "Type:",
        callType
      );
      const callId = `${user._id}-${receiverId}-${Date.now()}`;
      const callData = {
        callId,
        participantId: receiverId,
        participantName: receiverName,
        participantAvatar: receiverAvatar,
      };

      setCurrentCall(callData);
      setCallType(callType);
      setIsCallModelOpen(true);
      setCallStatus("calling");

      console.log("📡 FRONTEND: [MANAGER] Emitting initiate_call to server");
      //emit the call initiation event
      socket.emit("initiate_call", {
        callerId: user._id,
        receiverId,
        callType,
        callerInfo: {
          username: user.username,
          profilePicture: user.profilePicture,
        },
      });
    },
    [
      user,
      socket,
      setCurrentCall,
      setCallType,
      setIsCallModelOpen,
      setCallStatus,
    ]
  );

  // expose the initiateCall function to store
  useEffect(() => {
    useCallingStore.setState({ initiateCall });
  }, [initiateCall]);

  return <CallModel socket={socket} />;
};

export default CallManager;
