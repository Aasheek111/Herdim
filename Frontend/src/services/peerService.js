// peerService.js
import socket from "../Socket/socket";

export default function peerService() {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun1.l.google.com:19302" },
      {
        urls: "turn:relay1.expressturn.com:3480",
        username: "000000002074120375",
        credential: "jYlmwjdghSd+97J4JRTbvCiRSq8=",
      },
    ],
  });

  //  Send ICE candidates to remote peer
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate);
    }
  };

  // lets understand the flow hai ta if someone sends you an offer then you have to take that offer and set the
  // remote description and then create an answer and set the local description and then send the answer to the
  // other peer
  async function handleOffer(offer) {
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit("answer", answer);
    return answer;
  }

  //the answer we send to the other peer we take that and again set remote description
  async function handleAnswer(answer) {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  //  Handle incoming ICE candidate
  async function handleCandidate(candidate) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("Error adding received ice candidate", e);
    }
  }

  //  when we dial we make a offer and send it to the other peer
  async function createOffer() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit("offer", offer);
    console.log("OFFER Is", offer);
    return offer;
  }

  //  this is used to attach local stream camera mic haru
  function handleLocalStream(stream) {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }

  //  Listen for remote stream
  function onRemoteStream(callback) {
    pc.ontrack = (event) => {
      callback(event.streams[0]);
    };
  }

  function getSenders() {
    console.log("Senders", pc.getSenders());
    return pc.getSenders();
    
  }

  return {
    pc,
    createOffer,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleLocalStream,
    onRemoteStream,
    getSenders,
  };
}
