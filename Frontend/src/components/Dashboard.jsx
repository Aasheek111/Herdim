import React from "react";
import Chat from "./Chat";
import VideoChat from "./VideoChat";

function Dashboard() {
  return (
    <div className="flex min-h-dvh flex-col bg-[#f4f5f7] md:h-screen md:flex-row md:overflow-hidden">
      <VideoChat />
      <Chat />
    </div>
  );
}

export default Dashboard;
