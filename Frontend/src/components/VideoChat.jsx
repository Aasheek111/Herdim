import { useRef } from "react";
import socket from "../Socket/socket";
import React, { useEffect } from "react";
import { useUser } from "./UserContext";
import peerService from "../services/peerService";
import { useState } from "react";

const peer = peerService();
const {
  createOffer,
  handleOffer,
  handleAnswer,
  handleCandidate,
  handleLocalStream,
  onRemoteStream,
  getSenders,
  getLocalStream,
  pc,
} = peer;

function VideoChat() {
  const { room } = useUser();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const screenVideoRef = useRef(null);
  const [isShare, setisShare] = useState(false);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localVideo.current.srcObject = stream;
        handleLocalStream(stream);
      });

    socket.on("offer", async (offer) => {
      await handleOffer(offer);
    });

    socket.on("answer", (answer) => {
      handleAnswer(answer);
    });

    socket.on("candidate", (candidate) => {
      handleCandidate(candidate);
    });

    onRemoteStream((stream) => {
      remoteVideo.current.srcObject = stream;
    });

    return () => {
      socket.off("offer");
      socket.off("answer");
      socket.off("candidate"); //cleanup
    };
  }, []);

  const startCall = async () => {
    await createOffer();
    console.log("CLICKEDD");
  };
const shareScreen = async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true, 
    });
    //this is just simply getting the permission for screen share 

    const screenVideoTrack = screenStream.getVideoTracks()[0];//our required video track is in [0] so we get video track from here

//     [
//   RTCRtpSender { track: cameraVideoTrack, kind: "video" },
//   RTCRtpSender { track: micAudioTrack, kind: "audio" }
// ]
//pc has many senders and it sends sth like this .. 
//from there we take the video and replace it (amazing hai)

    const videoSender = pc.getSenders().find(
      (s) => s.track && s.track.kind === "video"//helps to find the person which is currently sending the data
    );
    if (videoSender) {
      await videoSender.replaceTrack(screenVideoTrack);
    }

    const screenAudioTrack = screenStream.getAudioTracks()[0];
    if (screenAudioTrack) {
      let audioSender = pc.getSenders().find(
        (s) => s.track && s.track.kind === "audio"
      );

      if (audioSender) {
        await audioSender.replaceTrack(screenAudioTrack);
      } else {
        pc.addTrack(screenAudioTrack, screenStream); 
      }
    }


    localVideo.current.srcObject = screenStream;
    setisShare(!isShare);

  } catch (err) {
    console.error("Error sharing screen:", err);
  }
};


  return (
    <div className="flex flex-col w-full min-h-[66vh] bg-neutral-200 p-2 md:p-5">
      {/* Video Container */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden flex items-center justify-center">
        <video
          ref={remoteVideo}
          autoPlay
          controls
          className="w-full h-full object-cover"
        />

        <div className="absolute top-2 right-2 w-24 h-24 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-white shadow-lg">
          <video
            ref={localVideo}
            autoPlay
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-3 mt-4 flex-wrap">
        <button
          className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl"
          onClick={startCall}
        >
          Call
        </button>
        <button
          className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white font-semibold rounded-xl"
          onClick={shareScreen}
        >
          {isShare ? "Stop Sharing" : "Start Sharing"}
        </button>
      </div>
    </div>
  );
}

export default VideoChat;
