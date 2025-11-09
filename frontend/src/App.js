import React, { useState, useEffect } from "react";
import HomePage from "./HomePage";
import ArtPathFinder from "./ArtPathFinder";

function App() {
  const [started, setStarted] = useState(false);
  const [message, setMessage] = useState("");
  const [initialArtworks, setInitialArtworks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/six_degrees/")
      .then((res) => res.json())
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
        }
      })
      .catch(err => {
        console.error("Backend connection error:", err);
        setMessage("⚠️ Cannot connect to backend. Make sure Django server is running on http://localhost:8080");
      });
  }, []);

  const handleEnter = (artworks) => {
    setInitialArtworks(artworks);
    setStarted(true);
  };

  const handleBack = async () => {
    // Clear database when navigating back to HomePage
    try {
      await fetch('http://localhost:8080/api/six_degrees/clear_artworks/', {
        method: 'POST',
        credentials: 'include',
      });
      console.log('Database cleared on back navigation');
    } catch (err) {
      console.error('Error clearing database on back:', err);
    }
    setStarted(false);
    setInitialArtworks([]);
  };

  const handlePlayAgain = (newArtworks) => {
    setInitialArtworks(newArtworks);
    // Keep started as true, but reset will happen in ArtPathFinder
  };

  if (!started) {
    return <HomePage onEnter={handleEnter} message={message} />;
  }

  return (
    <div className="min-h-screen">
      <ArtPathFinder 
        onBack={handleBack} 
        initialArtworks={initialArtworks}
        onPlayAgain={handlePlayAgain}
      />
    </div>
  );
}

export default App;
