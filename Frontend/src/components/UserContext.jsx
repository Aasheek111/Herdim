import React from "react";
import { useState } from "react";
import { useContext } from "react";
import { createContext } from "react";

const MyContext = createContext();

export function UserProvider(prop) {
  const [user, setUser] = useState("");
  const [room, setRoom] = useState("");
  const [islogin, setIslogin] = useState(false);

  const val = {
    user,
    setUser,
    islogin,
    setIslogin,
    room,
    setRoom,
  };
  return <MyContext.Provider value={val}>{prop.children}</MyContext.Provider>;
}
export function useUser() {
  return useContext(MyContext);
}
