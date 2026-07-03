import React from "react";
import Chat from "./Chat";
import VideoChat from "./VideoChat";

function Dashboard() {
  return (
    <div className="flex h-screen flex-col sm:flex-row bg-[#f4f5f7] overflow-hidden">
      <VideoChat />
      <Chat />
    </div>
  );
}

export default Dashboard;
