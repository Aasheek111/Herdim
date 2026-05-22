import React, { useState } from "react";
import { useUser } from "./UserContext";
import { SiOnlyfans } from "react-icons/si";
import { FaGithub } from "react-icons/fa";
function Login() {
  const { setUser, setIslogin } = useUser();
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  const handelSubmit = (e) => {
    e.preventDefault();

    if (name.trim() === "" || room.trim() === "") {
      setError("Fields cannot be empty !!");
    } else {
      setUser({ name, room });
      setIslogin(true);
    }
  };

  return (
    <div className="bg-neutral-200  min-h-screen w-full   flex justify-center font-mono text-black ">
      <form
        action=""
        className="flex flex-col w-sm  bg-neutral-100 items-center m-20 p-15 rounded-2xl shadow-neutral-500 shadow-xs"
        id="form"
        onSubmit={handelSubmit}
      >
        <h1 className="mb-7 text-4xl">Login</h1>
        Name:
        <input
          type="text"
          name=""
          autoComplete="off"
          className="  p-1 border-b-2 outline-none m-2 mb-7"
          id="name"
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        Room Name:
        <input
          type="text"
          name=""
          autoComplete="off"
          className=" border-b-2 p-1 outline-none m-2"
          id="room"
          onChange={(e) => {
            setRoom(e.target.value);
          }}
        />
        <button className="p-2 m-4 border rounded-xl mt-5 w-50 cursor-pointer bg-neutral-900 border-none hover:bg-neutral-800 text-white">
          Login
        </button>
        <div id="error" className="text-red-500">
          {error}
        </div>
        
        <div className="flex mx-auto shadow-neutral-500 shadow-xs p-2 w-40 mt-7 my-2 rounded-xl  cursor-pointer  hover:bg-neutral-200">
          Github
          <FaGithub  size={23} className="mx-2"/>
        </div>

        <div className="flex mx-auto shadow-xs shadow-neutral-500  mt-1 p-2 w-40 rounded-xl cursor-pointer hover:bg-neutral-200 ">
          OnlyFans
          <SiOnlyfans size={23} className="mx-2" />
        </div>
      </form>
    </div>
  );
}

export default Login;
