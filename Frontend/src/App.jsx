import React from "react";
import Login from "./components/Login";
import { useState } from "react";
import { useUser } from "./components/UserContext";

import Dashboard from "./components/Dashboard";

function App() {
  const { islogin } = useUser();
  return <>{islogin ? <Dashboard /> : <Login />}</>;
}

export default App;
