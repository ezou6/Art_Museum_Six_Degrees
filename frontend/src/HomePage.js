import React from 'react';
import './HomePage.css';

const HomePage = ({ onEnter, message }) => {
  return (
    <div className="home-page">
      <div className="home-content fade-in">
        <div className="museum-logo">
          <div className="logo-icon">🎨</div>
        </div>
        <h1 className="home-title">
          Princeton University<br />
          <span className="title-accent">Art Museum</span>
        </h1>
        <h2 className="home-subtitle">Six Degrees of Separation</h2>
        <p className="home-description">
          Discover the connections between artworks through artists, cultures, periods, and more.
          Find the shortest path from one masterpiece to another.
        </p>
        {message && (
          <div className="home-message">
            {message}
          </div>
        )}
        <button
          className="enter-button"
          onClick={onEnter}
        >
          <span>Enter the Exhibit</span>
          <span className="button-arrow">→</span>
        </button>
      </div>
      <div className="home-background">
        <div className="floating-shape shape-1"></div>
        <div className="floating-shape shape-2"></div>
        <div className="floating-shape shape-3"></div>
      </div>
    </div>
  );
};

export default HomePage;
