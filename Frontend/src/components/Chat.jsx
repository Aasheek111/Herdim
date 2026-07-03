import React from "react";
import { useUser } from "./UserContext";
import { useEffect } from "react";
import { useState } from "react";
import socket from "../Socket/socket";
import { useRef } from "react";
import { FaPaperPlane, FaUsers } from "react-icons/fa";

function Chat() {
  const {
    user,
    roomUsers,
    setRoomUsers,
    selectedUser,
    setSelectedUser,
  } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const isJoined = useRef(false);
  const chatRef = useRef(null);

  //for auto scroll
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isJoined.current) {
      socket.emit("joined", user);
      isJoined.current = true;
    }

    socket.on("room-users", (people) => {
      const usersWithoutMe = people.filter((person) => person.id !== socket.id);
      setRoomUsers(usersWithoutMe);

      if (
        selectedUser &&
        !usersWithoutMe.find((person) => person.id === selectedUser.id)
      ) {
        setSelectedUser(null);
      }
    });

    socket.on("chat", ({ user, message, to, from }) => {
      setMessages((prev) => [
        ...prev,
        { type: "chat", user, message, to, from },
      ]);
    });

    socket.on("joined", (person) => {
      //   users.push(person);
      //   setUsers((prev) => [...prev, person]);
      setMessages((prev) => [
        ...prev,
        { type: "joined", person: person.name, message: "Joined the room" },
      ]);
    });

    socket.on("left", (person) => {
      setMessages((prev) => [
        ...prev,
        { type: "joined", person: person.name, message: "Left the room" },
      ]);
    });
    return () => {
      socket.off("room-users");
      socket.off("chat");
      socket.off("joined");
      socket.off("left");
    };
  }, [selectedUser, setRoomUsers, setSelectedUser, user]);

  const handelSend = (e) => {
    e.preventDefault();
    if (message.trim() == "") return;
    console.log(user);
    socket.emit("chat", {
      user,
      message,
      to: selectedUser ? selectedUser.id : null,
    });
    setMessage("");
  };

  return (
    <aside className="w-full sm:w-[380px] bg-white border-l border-neutral-200 flex flex-col text-black h-[42vh] sm:h-screen">
      <div className="p-4 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-950">Room</h2>
            <p className="text-sm text-neutral-500">
              {roomUsers.length + 1} people online
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FaUsers />
          </div>
        </div>

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          <button
            className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
              !selectedUser
                ? "bg-blue-600 text-white"
                : "bg-neutral-100 hover:bg-neutral-200"
            }`}
            onClick={() => setSelectedUser(null)}
          >
            <span>Everyone</span>
            <span className="text-xs opacity-80">room</span>
          </button>

          <div className="w-full text-left p-3 rounded-xl bg-neutral-100 flex items-center justify-between">
            <span>{user.name}</span>
            <span className="text-xs text-neutral-500">you</span>
          </div>

          {roomUsers.map((person) => (
            <button
              key={person.id}
              className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors ${
                selectedUser?.id === person.id
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-100 hover:bg-neutral-200"
              }`}
              onClick={() => setSelectedUser(person)}
            >
              <span>{person.name}</span>
              <span className="text-xs opacity-80">online</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
        <div className="text-xs uppercase text-neutral-500">Chatting with</div>
        <div className="font-semibold text-neutral-950">
          {selectedUser ? selectedUser.name : "Everyone"}
        </div>
      </div>

      <div
        className="chat flex-1 flex flex-col gap-2 overflow-y-auto p-4 bg-[#f7f8fa]"
        ref={chatRef}
      >
        {messages.map((mes, ind) => {
          // map must return jsx but i didnot so i got error here
          if (mes.type == "joined") {
            return (
              <div
                key={ind}
                className="text-center text-xs text-neutral-500 my-1"
              >
                <b className="text-green-700">{mes.person}</b> {mes.message}
              </div>
            );
          } else if (mes.type == "chat") {
            const isPrivate = mes.to;
            const isMine = mes.user.name == user.name;

            return (
              <div
                key={ind}
                className={`max-w-[85%] rounded-2xl px-3 py-2 shadow-sm ${
                  isMine
                    ? "self-end bg-blue-600 text-white rounded-br-md"
                    : "self-start bg-white text-neutral-900 rounded-bl-md"
                }`}
              >
                <div className="text-xs opacity-80 mb-1">
                  {mes.user.name}
                  {isPrivate ? " private" : ""}
                </div>
                <div className="break-words">{mes.message}</div>
              </div>
            );
          }
        })}
      </div>

      <div className="p-3 border-t border-neutral-200 bg-white">
        {/* this is chat Send */}
        <form action="" className="flex gap-2" onSubmit={handelSend}>
          <input
            type="text"
            className="border border-neutral-300 p-3 rounded-xl w-full outline-none focus:border-blue-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              selectedUser ? `Message ${selectedUser.name}` : "Message everyone"
            }
          />
          <button
            type="submit"
            className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center"
            title="Send message"
          >
            <FaPaperPlane />
          </button>
        </form>
      </div>
    </aside>
  );
}

export default Chat;
