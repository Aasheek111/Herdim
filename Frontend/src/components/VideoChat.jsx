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
  resetConnection,
} = peer;

function VideoChat() {
  const { user, roomUsers, selectedUser, setSelectedUser } = useUser();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const originalStream = useRef(null);
  const screenStreamRef = useRef(null);
  const callUserRef = useRef(null);
  const isStoppingShareRef = useRef(false);
  const isShareRef = useRef(false);
  const ringSound = useRef({ context: null, timer: null });
  const [isShare, setisShare] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callUser, setCallUser] = useState(null);
  const [callStatus, setCallStatus] = useState("Idle");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [hasRemoteStream, setHasRemoteStream] = useState(false);

  useEffect(() => {
    isShareRef.current = isShare;
  }, [isShare]);

  useEffect(() => {
    callUserRef.current = callUser;
  }, [callUser]);

  const rememberCallUser = (person) => {
    if (!person) return;

    callUserRef.current = person;
    setCallUser(person);
  };

  const playVideo = async (videoElement, stream) => {
    if (!videoElement || !stream) return;

    videoElement.srcObject = stream;

    try {
      await videoElement.play();
    } catch (err) {
      console.error("Video play blocked:", err);
    }
  };

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

  const startLocalMedia = async () => {
    if (originalStream.current) {
      await playVideo(localVideo.current, originalStream.current);
      handleLocalStream(originalStream.current);
      return originalStream.current;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    originalStream.current = stream;
    handleLocalStream(stream);
    await playVideo(localVideo.current, stream);
    setIsMuted(false);
    setIsCameraOff(false);

    return stream;
  };

  useEffect(() => {
    startLocalMedia()
      .catch((err) => {
        console.error("Camera or mic error:", err);
        setCallStatus("Camera or mic blocked");
      });

    socket.on("call-user", ({ from }) => {
      rememberCallUser(from);
      setIncomingCall(from);
      setCallStatus(`${from.name} is ringing`);
      startRingSound();
    });

    socket.on("accept-call", async ({ from }) => {
      stopRingSound();
      rememberCallUser(from);
      setSelectedUser(from);
      setCallStatus(`Connecting with ${from.name}`);
      resetConnection(from.id);
      await startLocalMedia();
      await createOffer(from.id);
    });

    socket.on("offer", async ({ offer, from }) => {
      stopRingSound();
      await startLocalMedia();
      await handleOffer(offer, from);
      setCallStatus("In call");
    });

    socket.on("answer", ({ answer, from }) => {
      stopRingSound();
      handleAnswer(answer, from);
      setCallStatus("In call");
    });

    socket.on("candidate", ({ candidate, from }) => {
      handleCandidate(candidate, from);
    });

    socket.on("end-call", async ({ from }) => {
      if (isShareRef.current) {
        await stopShareScreen(false);
      }
      clearRemoteCall(`${from.name} left the call`);
      resetConnection();
    });

    onRemoteStream((stream) => {
      playVideo(remoteVideo.current, stream);
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
    const rememberedUser = roomUsers.find(
      (person) => person.id === callUserRef.current?.id
    );
    const targetUser = selectedUser || rememberedUser;
    if (!targetUser) return;

    try {
      rememberCallUser(targetUser);
      setSelectedUser(targetUser);
      setCallStatus(`Ringing ${targetUser.name}`);
      startRingSound();
      resetConnection(targetUser.id);
      await startLocalMedia();
      socket.emit("call-user", { to: targetUser.id, from: user });
    } catch (err) {
      console.error("Call start error:", err);
      stopRingSound();
      resetConnection();
      setCallStatus("Camera or mic blocked");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall) return;

    try {
      stopRingSound();
      rememberCallUser(incomingCall);
      setSelectedUser(incomingCall);
      setCallStatus(`Connecting with ${incomingCall.name}`);
      resetConnection(incomingCall.id);
      await startLocalMedia();
      socket.emit("accept-call", { to: incomingCall.id, from: user });
      setIncomingCall(null);
    } catch (err) {
      console.error("Accept call error:", err);
      resetConnection();
      setCallStatus("Camera or mic blocked");
    }
  };

  const ignoreCall = () => {
    stopRingSound();
    setIncomingCall(null);
    setCallStatus("Idle");
  };

  const stopShareScreen = async (renegotiate = true) => {
    if (isStoppingShareRef.current) return;

    isStoppingShareRef.current = true;
    try {
      const cameraStream = originalStream.current || getLocalStream();
      const cameraVideoTrack = cameraStream?.getVideoTracks()[0];

      await replaceVideoTrack(cameraVideoTrack, renegotiate);

      if (screenStreamRef.current) {
        screenStreamRef.current.getVideoTracks().forEach((track) => {
          track.onended = null;
        });
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
      }

      if (localVideo.current && cameraStream) {
        await playVideo(localVideo.current, cameraStream);
      }

      setisShare(false);
      if (hasRemoteStream) {
        setCallStatus("In call");
      }
    } finally {
      isStoppingShareRef.current = false;
    }
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

      screenVideoTrack.onended = () => stopShareScreen(true);
      await playVideo(localVideo.current, screenStream);
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

    const targetUser = callUserRef.current || selectedUser;

    if (targetUser) {
      socket.emit("end-call", { to: targetUser.id, from: user });
    }

    clearRemoteCall("You left the call");
    resetConnection();
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

  const normalizedStatus = callStatus.toLowerCase();
  const isCallBusy =
    hasRemoteStream ||
    normalizedStatus.includes("ringing") ||
    normalizedStatus.includes("connecting") ||
    normalizedStatus.includes("sharing");
  const rememberedUser = callUser
    ? roomUsers.find((person) => person.id === callUser.id)
    : null;
  const displayUser = isCallBusy
    ? callUser || selectedUser
    : selectedUser || rememberedUser;
  const supportsScreenShare = Boolean(navigator.mediaDevices?.getDisplayMedia);
  const canShareScreen = displayUser && hasRemoteStream && supportsScreenShare;
  const canLeaveCall = displayUser && isCallBusy;
  const canStartCall = (selectedUser || rememberedUser) && !isCallBusy;

  return (
    <div className="flex flex-col flex-1 min-h-[58vh] bg-[#eef1f5] p-3 md:min-h-screen md:p-5">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between md:mb-4">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
            Herdim room
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-950 leading-tight">
            Video Call
          </h1>
          <p className="text-sm text-neutral-500 truncate">
            {displayUser ? `Calling target: ${displayUser.name}` : "Pick someone from the room"}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl px-4 py-3 text-left shadow-sm sm:text-right">
          <div className="text-xs uppercase text-neutral-500">Status</div>
          <div className="font-semibold text-neutral-900 break-words">{callStatus}</div>
        </div>
      </div>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 md:hidden">
        {roomUsers.length === 0 ? (
          <div className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500">
            Waiting for someone to join this room
          </div>
        ) : (
          roomUsers.map((person) => (
            <button
              key={person.id}
              type="button"
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${
                selectedUser?.id === person.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-neutral-200 bg-white text-neutral-800"
              }`}
              onClick={() => setSelectedUser(person)}
            >
              {person.name}
            </button>
          ))
        )}
      </div>

      {/* Video Container */}
      <div className="relative flex-1 min-h-[300px] max-h-[58vh] bg-neutral-950 rounded-2xl overflow-hidden flex items-center justify-center shadow-[0_24px_60px_rgba(15,23,42,0.18)] border border-neutral-900 sm:min-h-[420px] md:max-h-none">
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
                {displayUser?.name?.charAt(0)?.toUpperCase() || "H"}
              </div>
            </div>
            <div className="text-xl font-semibold">
              {displayUser ? displayUser.name : "No one selected"}
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              {displayUser ? "Ring to start the call" : "Choose someone from the room"}
            </div>
          </div>
        )}

        <div className="absolute top-3 right-3 w-28 h-24 rounded-xl overflow-hidden border border-white/30 shadow-2xl bg-neutral-900 sm:top-4 sm:right-4 sm:w-40 sm:h-32 md:w-48 md:h-36">
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
      <div className="grid grid-cols-5 gap-2 mt-3 sm:flex sm:justify-center sm:gap-3 sm:mt-4 sm:flex-wrap">
        <button
          className="h-12 min-w-0 px-3 bg-green-700 hover:bg-green-600 disabled:bg-neutral-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm sm:px-5 sm:rounded-2xl"
          onClick={startCall}
          disabled={!canStartCall}
          title="Ring selected person"
        >
          <FaPhoneAlt />
          <span className="hidden truncate sm:inline">
            {displayUser ? `Ring ${displayUser.name}` : "Select"}
          </span>
        </button>
        <button
          className="h-12 min-w-0 px-3 bg-orange-600 hover:bg-orange-500 disabled:bg-neutral-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm sm:px-5 sm:rounded-2xl"
          onClick={shareScreen}
          disabled={!canShareScreen}
          title="Share your screen"
        >
          {isShare ? <FaStopCircle /> : <FaDesktop />}
          <span className="hidden truncate sm:inline">
            {isShare ? "Stop Share" : "Share"}
          </span>
        </button>
        <button
          className="h-12 w-12 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 rounded-xl flex items-center justify-center shadow-sm sm:rounded-2xl"
          onClick={toggleMute}
          title={isMuted ? "Unmute mic" : "Mute mic"}
        >
          {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
        </button>
        <button
          className="h-12 w-12 bg-white border border-neutral-300 hover:bg-neutral-100 text-neutral-900 rounded-xl flex items-center justify-center shadow-sm sm:rounded-2xl"
          onClick={toggleCamera}
          title={isCameraOff ? "Turn camera on" : "Turn camera off"}
        >
          {isCameraOff ? <FaVideoSlash /> : <FaVideo />}
        </button>
        <button
          className="h-12 w-12 bg-red-600 hover:bg-red-500 disabled:bg-neutral-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm sm:w-auto sm:px-5 sm:rounded-2xl"
          onClick={leaveCall}
          disabled={!canLeaveCall}
          title="Leave call"
        >
          <FaPhoneSlash />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}

export default VideoChat;
