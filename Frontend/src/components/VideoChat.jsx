import { useRef } from "react";
import socket from "../Socket/socket";
import React, { useEffect } from "react";
import { useUser } from "./UserContext";
import peerService from "../services/peerService";
import { useState } from "react";
import {
  FaDesktop,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPhoneAlt,
  FaPhoneSlash,
  FaStopCircle,
  FaVideo,
  FaVideoSlash,
} from "react-icons/fa";

const peer = peerService();
const {
  createOffer,
  handleOffer,
  handleAnswer,
  handleCandidate,
  handleLocalStream,
  onRemoteStream,
  getLocalStream,
  replaceVideoTrack,
} = peer;

function VideoChat() {
  const { user, selectedUser, setSelectedUser } = useUser();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const originalStream = useRef(null);
  const screenStreamRef = useRef(null);
  const isShareRef = useRef(false);
  const ringSound = useRef({ context: null, timer: null });
  const [isShare, setisShare] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState("Idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  useEffect(() => {
    isShareRef.current = isShare;
  }, [isShare]);

  const stopRingSound = () => {
    if (ringSound.current.timer) {
      clearInterval(ringSound.current.timer);
    }

    if (ringSound.current.context) {
      ringSound.current.context.close();
    }

    ringSound.current = { context: null, timer: null };
  };

  const startRingSound = () => {
    try {
      stopRingSound();

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const context = new AudioContext();
      const playBeep = () => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 840;
        gain.gain.setValueAtTime(0.001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.09, context.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.32);

        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.35);
      };

      playBeep();
      ringSound.current = {
        context,
        timer: setInterval(playBeep, 850),
      };
    } catch (err) {
      console.error("Ring sound error:", err);
    }
  };

  const clearRemoteCall = (status = "Call ended") => {
    stopRingSound();

    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }

    setIncomingCall(null);
    setHasRemoteStream(false);
    setCallStatus(status);
  };

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        originalStream.current = stream;
        localVideo.current.srcObject = stream;
        handleLocalStream(stream);
      })
      .catch((err) => {
        console.error("Camera or mic error:", err);
        setCallStatus("Camera or mic blocked");
      });

    socket.on("call-user", ({ from }) => {
      setIncomingCall(from);
      setCallStatus(`${from.name} is ringing`);
      startRingSound();
    });

    socket.on("accept-call", async ({ from }) => {
      stopRingSound();
      setSelectedUser(from);
      setCallStatus(`Connecting with ${from.name}`);
      await createOffer(from.id);
    });

    socket.on("offer", async ({ offer, from }) => {
      stopRingSound();
      await handleOffer(offer, from);
      setCallStatus("In call");
    });

    socket.on("answer", ({ answer, from }) => {
      stopRingSound();
      handleAnswer(answer, from);
      setCallStatus("In call");
    });

    socket.on("candidate", ({ candidate }) => {
      handleCandidate(candidate);
    });

    socket.on("end-call", async ({ from }) => {
      if (isShareRef.current) {
        await stopShareScreen(false);
      }
      clearRemoteCall(`${from.name} left the call`);
    });

    onRemoteStream((stream) => {
      remoteVideo.current.srcObject = stream;
      setHasRemoteStream(true);
      setCallStatus("In call");
    });

    return () => {
      stopRingSound();
      socket.off("call-user");
      socket.off("accept-call");
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate");
      socket.off("end-call"); //cleanup
    };
  }, [setSelectedUser]);

  const startCall = async () => {
    if (!selectedUser) return;
    setCallStatus(`Ringing ${selectedUser.name}`);
    startRingSound();
    socket.emit("call-user", { to: selectedUser.id, from: user });
    console.log("CLICKEDD");
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    stopRingSound();
    setSelectedUser(incomingCall);
    setCallStatus(`Connecting with ${incomingCall.name}`);
    socket.emit("accept-call", { to: incomingCall.id, from: user });
    setIncomingCall(null);
  };

  const ignoreCall = () => {
    stopRingSound();
    setIncomingCall(null);
    setCallStatus("Idle");
  };

  const stopShareScreen = async (renegotiate = true) => {
    const stream = getLocalStream() || originalStream.current;
    const cameraVideoTrack = stream?.getVideoTracks()[0];

    await replaceVideoTrack(cameraVideoTrack, renegotiate);

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    localVideo.current.srcObject = stream;
    setisShare(false);
  };

  const shareScreen = async () => {
    if (isShare) {
      await stopShareScreen();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      //this is just simply getting the permission for screen share

      screenStreamRef.current = screenStream;
      const screenVideoTrack = screenStream.getVideoTracks()[0]; //our required video track is in [0] so we get video track from here

      //     [
      //   RTCRtpSender { track: cameraVideoTrack, kind: "video" },
      //   RTCRtpSender { track: micAudioTrack, kind: "audio" }
      // ]
      //pc has many senders and it sends sth like this ..
      //from there we take the video and replace it (amazing hai)

      await replaceVideoTrack(screenVideoTrack, true);

      screenVideoTrack.onended = stopShareScreen;
      localVideo.current.srcObject = screenStream;
      setisShare(true);
      setCallStatus("Sharing screen");
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const leaveCall = async () => {
    if (isShare) {
      await stopShareScreen(false);
    }

    if (selectedUser) {
      socket.emit("end-call", { to: selectedUser.id, from: user });
    }

    clearRemoteCall("You left the call");
  };

  const toggleMute = () => {
    const stream = getLocalStream() || originalStream.current;
    const audioTrack = stream?.getAudioTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCamera = () => {
    const stream = getLocalStream() || originalStream.current;
    const videoTrack = stream?.getVideoTracks()[0];

    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
    }
  };

  const canShareScreen = selectedUser && hasRemoteStream;
  const canLeaveCall =
    selectedUser && (hasRemoteStream || callStatus.toLowerCase().includes("ringing"));

  return (
    <div className="flex flex-col flex-1 min-h-[66vh] bg-[#eef1f5] p-3 md:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Herdim room
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-950">
            Video Call
          </h1>
          <p className="text-sm text-neutral-500">
            {selectedUser ? `Talking target: ${selectedUser.name}` : "Pick someone from the room"}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl px-4 py-3 text-right shadow-sm">
          <div className="text-xs uppercase text-neutral-500">Status</div>
          <div className="font-semibold text-neutral-900">{callStatus}</div>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative flex-1 min-h-[440px] bg-neutral-950 rounded-[1.25rem] overflow-hidden flex items-center justify-center shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-neutral-900">
        <video
          ref={remoteVideo}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!hasRemoteStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300 bg-[radial-gradient(circle_at_center,_#222_0,_#090909_55%)]">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
              <div className="relative w-24 h-24 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-4xl shadow-xl">
                {selectedUser?.name?.charAt(0)?.toUpperCase() || "H"}
              </div>
            </div>
            <div className="text-xl font-semibold">
              {selectedUser ? selectedUser.name : "No one selected"}
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              {selectedUser ? "Ring to start the call" : "Choose someone from the room"}
            </div>
          </div>
        )}

        <div className="absolute top-4 right-4 w-32 h-28 md:w-48 md:h-36 rounded-2xl overflow-hidden border border-white/30 shadow-2xl bg-neutral-900">
          <video
            ref={localVideo}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isShare ? "" : "transform -scale-x-100"}`}
          />
          <div className="absolute left-2 bottom-2 text-[11px] bg-black/70 text-white px-2 py-1 rounded-full">
            {isShare ? "Screen sharing" : "You"}
          </div>
        </div>

        {isShare && (
          <div className="absolute left-4 top-4 bg-orange-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-lg">
            Screen sharing
          </div>
        )}

        {incomingCall && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white text-black p-6 rounded-[1.5rem] shadow-2xl border border-neutral-200 text-center">
              <div className="relative w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
                <div className="relative w-24 h-24 rounded-full bg-green-700 text-white flex items-center justify-center text-4xl font-bold">
                  {incomingCall.name?.charAt(0)?.toUpperCase()}
                </div>
              </div>
              <div className="text-xs uppercase tracking-widest text-green-700 font-bold">
                Incoming call
              </div>
              <h2 className="text-2xl font-bold mt-1">{incomingCall.name}</h2>
              <p className="text-neutral-500 mt-2">wants to talk with you</p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                <button
                  className="h-12 bg-green-700 text-white rounded-xl hover:bg-green-600 font-semibold"
                  onClick={acceptCall}
                >
                  Accept
                </button>
                <button
                  className="h-12 bg-red-600 text-white rounded-xl hover:bg-red-500 font-semibold"
                  onClick={ignoreCall}
                >
                  Ignore
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-3 mt-4 flex-wrap">
        <button
          className="h-12 px-5 bg-green-700 hover:bg-green-600 disabled:bg-neutral-400 text-white font-semibold rounded-2xl flex items-center gap-2 shadow-sm"
          onClick={startCall}
          disabled={!selectedUser || hasRemoteStream}
          title="Ring selected person"
        >
          <FaPhoneAlt />
          {selectedUser ? `Ring ${selectedUser.name}` : "Select Person"}
        </button>
        <button
          className="h-12 px-5 bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-400 text-white font-semibold rounded-2xl flex items-center gap-2 shadow-sm"
          onClick={shareScreen}
          disabled={!canShareScreen}
          title="Share your screen"
        >
          {isShare ? <FaStopCircle /> : <FaDesktop />}
          {isShare ? "Stop Sharing" : "Share Screen"}
        </button>
        <button
          className="h-12 w-12 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 rounded-2xl flex items-center justify-center shadow-sm"
          onClick={toggleMute}
          title={isMuted ? "Unmute mic" : "Mute mic"}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button
          className="h-12 w-12 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 rounded-2xl flex items-center justify-center shadow-sm"
          onClick={toggleCamera}
          title={isCameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {isCameraOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
        <button
          className="h-12 px-5 bg-red-600 hover:bg-red-500 disabled:bg-neutral-400 text-white font-semibold rounded-2xl flex items-center gap-2 shadow-sm"
          onClick={leaveCall}
          disabled={!canLeaveCall}
          title="Leave call"
        >
          <FaPhoneSlash />
          Leave
        </button>
      </div>
    </div>
  );
}

export default VideoChat;
