import React, { useState } from 'react';

// Helper function to convert IIIF URLs to viewable image URLs
const convertImageUrl = (url) => {
  if (!url) return null;
  // If it's already a full image URL, return as is
  if (url.includes('/full/') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return url;
  }
  // If it's a IIIF URL, convert it
  if (url.includes('/iiif/')) {
    return url.replace(/\/$/, '') + '/full/800,/0/default.jpg';
  }
  return url;
};

// Helper function to format relation type for display
const formatRelation = (relation) => {
  if (!relation) return null;
  // Capitalize first letter and make it more readable
  const formatted = relation.charAt(0).toUpperCase() + relation.slice(1).toLowerCase();
  // Handle special cases - add "Same" prefix for appropriate relations
  const relationMap = {
    'Artist': 'Same Artist',
    'Style': 'Same Style',
    'Material': 'Same Material',
    'Period': 'Same Period',
    'Text': 'Similar Text',
    'Department': 'Same Department',
  };
  return relationMap[formatted] || `Same ${formatted}`;
};

const EndPage = ({ 
  startingArtwork, 
  targetArtwork, 
  selectedArtwork, 
  navigationStack,
  onPlayAgain,
  onResetState
}) => {
  const [loadingPlayAgain, setLoadingPlayAgain] = useState(false);
  const [error, setError] = useState(null);

  // Handle Play Again button
  const handlePlayAgain = async () => {
    setLoadingPlayAgain(true);
    setError(null); // Clear any previous errors
    try {
      // Step 1: Clear all artworks from database
      console.log('Clearing all artworks from database...');
      const clearResponse = await fetch('http://localhost:8080/api/six_degrees/clear_artworks/', {
        method: 'POST'
      });
      
      if (!clearResponse.ok) {
        const errorText = await clearResponse.text();
        throw new Error(`Failed to clear artworks: ${errorText}`);
      }

      const clearData = await clearResponse.json();
      console.log('Cleared artworks:', clearData);

      // Step 2: Fetch new random objects (this will import 1000 new ones)
      console.log('Importing 1000 new random artworks...');
      const randomResponse = await fetch('http://localhost:8080/api/six_degrees/random_objects/');
      
      if (!randomResponse.ok) {
        const errorText = await randomResponse.text();
        throw new Error(`Failed to fetch new artworks: ${errorText}`);
      }

      const data = await randomResponse.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log(`Successfully imported ${data.count || data.artworks?.length || 0} new artworks`);

      // Limit display to first 20 artworks (all 1000 are imported into database)
      const artworksToDisplay = (data.artworks || []).slice(0, 20);

      // Convert image URLs for display
      const artworksWithConvertedUrls = artworksToDisplay.map(art => ({
        ...art,
        image_url: convertImageUrl(art.image_url)
      }));

      // Reset all state via callback
      if (onResetState) {
        onResetState(artworksWithConvertedUrls);
      }

      // Call onPlayAgain callback with new artworks
      if (onPlayAgain) {
        onPlayAgain(artworksToDisplay);
      }
    } catch (err) {
      console.error('Error playing again:', err);
      setError(`Failed to start new game: ${err.message}`);
    } finally {
      setLoadingPlayAgain(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-5xl font-bold text-white mb-4">You Won!</h2>
          <p className="text-xl text-gray-300">
            Congratulations! You found the path to your target artwork!
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded">
            <p className="font-semibold mb-2">⚠️ Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Path Summary */}
        {startingArtwork && targetArtwork && (
          <div className="bg-gray-900 rounded-2xl p-8 mb-8 border border-gray-700">
            <h3 className="text-3xl font-bold text-white mb-6 text-center">Your Path to Victory</h3>
            
            <div className="space-y-6">
              {/* Starting Artwork */}
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                  {startingArtwork.image_url ? (
                    <img
                      src={startingArtwork.image_url}
                      alt={startingArtwork.title}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-full h-full hidden items-center justify-center text-4xl bg-gray-800 text-white" style={{ display: startingArtwork.image_url ? 'none' : 'flex' }}>
                    🎨
                  </div>
                </div>
                <div className="flex-1">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block mb-2">
                    <span className="font-semibold">Start</span>
                  </div>
                  <h4 className="text-xl font-bold text-white">{startingArtwork.title || 'Untitled'}</h4>
                  {startingArtwork.maker && (
                    <p className="text-gray-300">{startingArtwork.maker}</p>
                  )}
                </div>
              </div>

              {/* Path Steps with Relations */}
              {navigationStack.map((artwork, index) => {
                const relation = artwork.relationToNext;
                
                return (
                  <div key={artwork.id || artwork.object_id}>
                    {/* Connection Arrow with Relation */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-shrink-0 w-12 flex items-center justify-center">
                        <div className="text-2xl text-gray-400">→</div>
                      </div>
                      {relation && (
                        <div className="flex-1">
                          <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-700 text-white">
                            {formatRelation(relation)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Artwork */}
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                        {artwork.image_url ? (
                          <img
                            src={artwork.image_url}
                            alt={artwork.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="w-full h-full hidden items-center justify-center text-4xl bg-gray-800 text-white" style={{ display: artwork.image_url ? 'none' : 'flex' }}>
                          🎨
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-700 text-white px-4 py-2 rounded-lg inline-block mb-2">
                          <span className="font-semibold">Step {index + 1}</span>
                        </div>
                        <h4 className="text-xl font-bold text-white">{artwork.title || 'Untitled'}</h4>
                        {artwork.maker && (
                          <p className="text-gray-300">{artwork.maker}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Final Connection to Target */}
              {selectedArtwork && selectedArtwork.id !== startingArtwork.id && navigationStack.length > 0 && (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 flex items-center justify-center">
                      <div className="text-2xl text-gray-400">→</div>
                    </div>
                    {navigationStack[navigationStack.length - 1]?.relationToNext && (
                      <div className="flex-1">
                        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-700 text-white">
                          {formatRelation(navigationStack[navigationStack.length - 1].relationToNext)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Target Artwork */}
              {selectedArtwork && selectedArtwork.id !== startingArtwork.id && (
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedArtwork.image_url ? (
                      <img
                        src={selectedArtwork.image_url}
                        alt={selectedArtwork.title}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full hidden items-center justify-center text-4xl bg-gray-800 text-white" style={{ display: selectedArtwork.image_url ? 'none' : 'flex' }}>
                      🎯
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg inline-block mb-2">
                      <span className="font-semibold">Target</span>
                    </div>
                    <h4 className="text-xl font-bold text-white">{selectedArtwork.title || 'Untitled'}</h4>
                    {selectedArtwork.maker && (
                      <p className="text-gray-300">{selectedArtwork.maker}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Path Summary Stats */}
              <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                {(() => {
                  const pathLength = navigationStack.length + (selectedArtwork && selectedArtwork.id !== startingArtwork.id ? 1 : 0);
                  return (
                    <p className="text-xl text-gray-300">
                      You completed the path in <strong className="text-white">{pathLength}</strong> connection{pathLength !== 1 ? 's' : ''}!
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Play Again Button */}
        <div className="text-center">
          <button
            onClick={handlePlayAgain}
            disabled={loadingPlayAgain}
            className="bg-white text-gray-900 px-12 py-4 rounded-xl text-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            {loadingPlayAgain ? (
              <span className="flex items-center gap-3">
                <span>Loading New Game...</span>
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
              </span>
            ) : (
              'Play Again'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EndPage;

