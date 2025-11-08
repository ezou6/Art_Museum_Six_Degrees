import React, { useState } from 'react';

const HomePage = ({ onEnter, message }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEnter = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8080/api/six_degrees/random_objects/');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Pass the artworks to onEnter
      onEnter(data.artworks || []);
    } catch (err) {
      console.error('Error fetching random objects:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError('Cannot connect to backend server. Make sure the Django server is running on http://localhost:8080. Run: cd backend && python manage.py runserver');
      } else {
        setError(`Failed to load artworks: ${err.message}`);
      }
      setLoading(false);
    }
  };
  const backgroundImage = process.env.PUBLIC_URL + '/princeton-art-museum1.jpg';
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden p-8 bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: `url(${backgroundImage})`
      }}
    >
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 z-0"></div>
      
      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden z-0 opacity-30">
        <div className="absolute w-72 h-72 -top-24 -left-24 rounded-full bg-white bg-opacity-10 backdrop-blur-sm animate-float"></div>
        <div className="absolute w-48 h-48 -bottom-12 -right-12 rounded-full bg-white bg-opacity-10 backdrop-blur-sm animate-float" style={{ animationDelay: '5s' }}></div>
        <div className="absolute w-36 h-36 top-1/2 right-[10%] rounded-full bg-white bg-opacity-10 backdrop-blur-sm animate-float" style={{ animationDelay: '10s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white max-w-3xl animate-fade-in">
        
        <h1 className="text-6xl md:text-7xl font-bold mb-4 leading-tight drop-shadow-2xl">
          Princeton University<br />
          <span className="bg-gradient-to-r from-yellow-400 to-yellow-300 bg-clip-text text-transparent">
            Art Museum
          </span>
        </h1>
        
        <h2 className="text-2xl font-light mb-6 opacity-90 tracking-widest uppercase">
          Six Degrees of Separation
        </h2>
        
        <p className="text-lg md:text-xl leading-relaxed mb-12 opacity-95 max-w-2xl mx-auto">
          Discover the connections between artworks through artists, cultures, periods, and more.
          Find the shortest path from one artwork to another.
        </p>
        
        {message && (
          <div className="bg-white bg-opacity-20 backdrop-blur-md p-4 rounded-xl mb-8 border border-white border-opacity-30">
            {message}
          </div>
        )}
        
        {error && (
          <div className="bg-red-500 bg-opacity-80 backdrop-blur-md p-4 rounded-xl mb-8 border border-red-300 border-opacity-50">
            {error}
          </div>
        )}
        
        <button
          className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-900 border-none px-12 py-5 rounded-full text-xl font-bold cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-yellow-400/60 hover:-translate-y-1 hover:scale-105 active:scale-100 uppercase tracking-wide inline-flex items-center gap-4 group disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleEnter}
          disabled={loading}
        >
          {loading ? (
            <>
              <span>Loading...</span>
              <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            <>
              <span>Enter the Exhibit</span>
              <span className="text-2xl transition-transform duration-300 group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default HomePage;
