import React, { useEffect, useState } from "react";
import { useUser } from "./UserContext";
import { SiOnlyfans } from "react-icons/si";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

function Login() {
  const { setUser, setRoom: setRoomContext, setIslogin } = useUser();
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleReady(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const loginUser = (loginName, googleUser = {}) => {
    setError("");
    setRoomContext(room.trim());
    setUser({
      name: loginName.trim(),
      room: room.trim(),
      picture: googleUser.picture || "",
      email: googleUser.email || "",
      provider: googleUser.provider || "manual",
    });
    setIslogin(true);
  };

  const decodeGoogleUser = (token) => {
    const base64 = token
      .split(".")[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    return JSON.parse(atob(paddedBase64));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (name.trim() === "" || room.trim() === "") {
      setError("Fields cannot be empty !!");
      return;
    }

    loginUser(name);
  };

  const handleGoogleLogin = () => {
    if (room.trim() === "") {
      setError("Room Name cannot be empty !!");
      return;
    }

    if (!googleReady || !window.google) {
      setError("Add VITE_GOOGLE_CLIENT_ID in frontend env first !!");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: (response) => {
        const googleUser = decodeGoogleUser(response.credential);

        loginUser(googleUser.name, {
          email: googleUser.email,
          picture: googleUser.picture,
          provider: "google",
        });
      },
    });

    window.google.accounts.id.prompt();
  };

  return (
    <div className="bg-[#f4f5f7] min-h-screen w-full flex items-center justify-center p-5 font-mono text-black">
      <form
        className="w-full max-w-md bg-white border border-neutral-200 p-6 md:p-8 rounded-2xl shadow-sm"
        id="form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="mb-8">
          <div className="h-12 w-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center font-bold mb-4">
            H
          </div>
          <h1 className="text-3xl font-bold text-neutral-950">Join Herdim</h1>
          <p className="text-neutral-500 mt-2">
            Enter a room and start a private call or chat.
          </p>
        </div>

        <label htmlFor="name" className="text-sm font-semibold text-neutral-700">
          Name
        </label>
        <input
          type="text"
          id="name"
          autoComplete="off"
          className="p-3 border border-neutral-300 outline-none mt-2 mb-5 w-full rounded-xl focus:border-neutral-900 transition-colors"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (error) setError("");
          }}
        />

        <label htmlFor="room" className="text-sm font-semibold text-neutral-700">
          Room Name
        </label>
        <input
          type="text"
          id="room"
          autoComplete="off"
          className="border border-neutral-300 p-3 outline-none mt-2 w-full rounded-xl focus:border-neutral-900 transition-colors"
          value={room}
          onChange={(e) => {
            setRoom(e.target.value);
            if (error) setError("");
          }}
        />

        <button
          type="submit"
          className="p-3 mt-6 w-full cursor-pointer bg-neutral-950 rounded-xl hover:bg-neutral-800 text-white font-semibold transition-colors"
        >
          Join Room
        </button>

        <div
          id="error"
          role="alert"
          aria-live="polite"
          className="text-red-500 min-h-[1.5rem] mt-3 text-sm"
        >
          {error}
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-neutral-200"></div>
          <span className="text-xs text-neutral-400">or</span>
          <div className="h-px flex-1 bg-neutral-200"></div>
        </div>

        <button
          type="button"
          className="flex items-center justify-center w-full border border-neutral-300 p-3 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors bg-transparent"
          onClick={handleGoogleLogin}
        >
          Continue with Google
          <FcGoogle size={23} className="mx-2" />
        </button>

        <div className="grid grid-cols-2 gap-3 mt-3 opacity-60">
          <button
            type="button"
            className="flex items-center justify-center border border-neutral-200 p-3 rounded-xl cursor-not-allowed bg-neutral-50"
            disabled
          >
            Github
            <FaGithub size={21} className="mx-2" />
          </button>

          <button
            type="button"
            className="flex items-center justify-center border border-neutral-200 p-3 rounded-xl cursor-not-allowed bg-neutral-50"
            disabled
          >
            OnlyFans
            <SiOnlyfans size={21} className="mx-2" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;
