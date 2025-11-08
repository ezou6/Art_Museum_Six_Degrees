// src/HomePage.js
import React from 'react';


const HomePage = ({ onEnter }) => {
  return (
    <div 
      className="home-page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
      }}
    >
      <h1 style={{ fontSize: '4rem', marginBottom: '2rem' }}>
        Princeton University <br /> Art Museum
      </h1>
      <button
        onClick={onEnter}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          backgroundColor: '#f8c146',
          color: '#000',
          fontWeight: 'bold',
        }}
      >
        Enter the Exhibit
      </button>
    </div>
  );
};

export default HomePage;
