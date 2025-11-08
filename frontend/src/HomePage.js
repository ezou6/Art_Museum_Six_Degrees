import React from 'react';

const HomePage = ({ onEnter, message }) => {
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
        <div className="mb-8">
          <div className="text-8xl inline-block animate-pulse drop-shadow-lg">🎨</div>
        </div>
        
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
          Find the shortest path from one masterpiece to another.
        </p>
        
        {message && (
          <div className="bg-white bg-opacity-20 backdrop-blur-md p-4 rounded-xl mb-8 border border-white border-opacity-30">
            {message}
          </div>
        )}
        
        <button
          className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-gray-900 border-none px-12 py-5 rounded-full text-xl font-bold cursor-pointer transition-all duration-300 shadow-2xl hover:shadow-yellow-400/60 hover:-translate-y-1 hover:scale-105 active:scale-100 uppercase tracking-wide inline-flex items-center gap-4 group"
          onClick={onEnter}
        >
          <span>Enter the Exhibit</span>
          <span className="text-2xl transition-transform duration-300 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </div>
  );
};

export default HomePage;
