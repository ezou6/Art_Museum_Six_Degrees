import React, { useState, useEffect } from "react";
import HomePage from "./HomePage";
import ArtPathFinder from "./ArtPathFinder";
import "./App.css";

function App() {
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Test backend connection
    fetch("http://localhost:8000/api/six_degrees/")
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
        }
      })
      .catch(err => {
        console.error("Backend connection error:", err);
        setMessage("Connecting to backend...");
      });
  }, []);

  if (!started) {
    return <HomePage onEnter={() => setStarted(true)} message={message} />;
  }

  return (
    <div className="App">
      <ArtPathFinder onBack={() => setStarted(false)} />
    </div>
  );
}

export default App;
