import React, { useState, useEffect } from "react";
import HomePage from "./HomePage";

function App() {
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/api/hello/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(err => console.error(err));
  }, []);

  if (!started) {
    return <HomePage onEnter={() => setStarted(true)} message={message} />;
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Princeton University Art Museum</h1>
      <p>The main game will go here soon!</p>
      <button onClick={() => setStarted(false)}>Back to Home</button>
    </div>
  );
}

export default App;
