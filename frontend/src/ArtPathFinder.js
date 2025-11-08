import React, { useState, useEffect } from 'react';

const ArtPathFinder = ({ onBack }) => {
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const testBackendConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch('http://localhost:8000/api/six_degrees/');
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Backend is connected!\n\n${JSON.stringify(data, null, 2)}`);
      } else {
        alert(`❌ Backend returned error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      alert(`❌ Cannot connect to backend:\n\n${err.message}\n\nMake sure the Django server is running on http://localhost:8000`);
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    // Fetch artworks from both endpoints to ensure we get all artworks
    const fetchArtworks = async () => {
      try {
        let allArtworks = [];
        
        // Try artworks endpoint first
        try {
          const artworksResponse = await fetch('http://localhost:8000/api/six_degrees/artworks/');
          
          if (!artworksResponse.ok) {
            throw new Error(`HTTP error! status: ${artworksResponse.status}`);
          }
          
          const artworksData = await artworksResponse.json();
          
          if (artworksData.artworks && Array.isArray(artworksData.artworks)) {
            allArtworks = artworksData.artworks;
          }
        } catch (artworksErr) {
          console.warn('Artworks endpoint failed, trying graph endpoint:', artworksErr);
        }
        
        // If artworks endpoint doesn't have data, try graph endpoint
        if (allArtworks.length === 0) {
          try {
            const graphResponse = await fetch('http://localhost:8000/api/six_degrees/art_graph/');
            
            if (!graphResponse.ok) {
              throw new Error(`HTTP error! status: ${graphResponse.status}`);
            }
            
            const graphData = await graphResponse.json();
            
            if (graphData.nodes && Array.isArray(graphData.nodes) && graphData.nodes.length > 0) {
              allArtworks = graphData.nodes.map(node => ({
                id: node.id || node.object_id,
                object_id: node.id || node.object_id,
                title: node.title || node.label,
                maker: node.maker,
                date: node.date,
                medium: node.medium,
                image_url: node.image_url,
              }));
            }
          } catch (graphErr) {
            console.warn('Graph endpoint also failed:', graphErr);
          }
        }
        
        // Remove duplicates based on ID
        const uniqueArtworks = Array.from(
          new Map(allArtworks.map(art => [art.id || art.object_id, art])).values()
        );
        
        if (uniqueArtworks.length === 0) {
          setError('No artworks found. Please import artworks first by visiting: http://localhost:8000/api/six_degrees/import_art/');
        } else {
          setArtworks(uniqueArtworks);
          setError(null);
        }
        
        setLoadingArtworks(false);
      } catch (err) {
        console.error('Error fetching artworks:', err);
        setError(`Failed to load artworks: ${err.message}. Make sure the backend is running on http://localhost:8000`);
        setLoadingArtworks(false);
      }
    };
    
    fetchArtworks();
  }, []);

  const handleArtworkSelect = async (artwork) => {
    setSelectedArtwork(artwork);
    setLoading(true);
    setError(null);
    setConnections([]);

    try {
      const graphResponse = await fetch('http://localhost:8000/api/six_degrees/art_graph/');
      const graphData = await graphResponse.json();
      
      if (!graphData.nodes || !graphData.edges) {
        throw new Error('Invalid graph data format');
      }

      const artworkId = String(artwork.id || artwork.object_id);
      const connectedIds = new Set();
      
      graphData.edges.forEach(edge => {
        const source = String(edge.source || edge[0]);
        const target = String(edge.target || edge[1]);
        
        if (source === artworkId) {
          connectedIds.add(target);
        } else if (target === artworkId) {
          connectedIds.add(source);
        }
      });

      const connectedArtworks = graphData.nodes
        .filter(node => {
          const nodeId = String(node.id || node.object_id);
          return connectedIds.has(nodeId);
        })
        .map(node => ({
          id: node.id || node.object_id,
          object_id: node.id || node.object_id,
          title: node.title || node.label,
          maker: node.maker,
          date: node.date,
          medium: node.medium,
          image_url: node.image_url,
        }));

      setConnections(connectedArtworks);
    } catch (err) {
      console.error('Error finding connections:', err);
      setError('Failed to load connections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const backgroundImage = process.env.PUBLIC_URL + '/princeton-art-museum1.jpg';

  return (
    <div 
      className="min-h-screen py-8 bg-cover bg-center bg-no-repeat bg-fixed relative"
      style={{
        backgroundImage: `url(${backgroundImage})`
      }}
    >
      {/* Black overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-30 z-0"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl shadow-xl p-6 mb-8 flex justify-between items-center animate-fade-in">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            🎨 Art Path Finder
          </h1>
          <button 
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            onClick={onBack}
          >
            ← Back to Home
          </button>
        </div>

        {!selectedArtwork ? (
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl shadow-xl p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Choose Your Starting Artwork</h2>
                <p className="text-gray-600">Select an artwork to discover its connections</p>
              </div>
              {!loadingArtworks && artworks.length > 0 && (
                <div className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-lg font-semibold">
                  {artworks.length} Artwork{artworks.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {loadingArtworks && (
              <div className="text-center py-12">
                <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-600">Loading artworks...</p>
              </div>
            )}

            {!loadingArtworks && artworks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
                {artworks.map((artwork) => (
                  <div
                    key={artwork.id || artwork.object_id}
                    className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-2 flex flex-col group"
                    onClick={() => handleArtworkSelect(artwork)}
                  >
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                      {artwork.image_url ? (
                        <img
                          src={artwork.image_url}
                          alt={artwork.title || 'Artwork'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full hidden items-center justify-center text-6xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                        style={{ display: artwork.image_url ? 'none' : 'flex' }}
                      >
                        🎨
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                        {artwork.title || 'Untitled'}
                      </h3>
                      {artwork.maker && (
                        <p className="text-indigo-600 text-sm font-medium mb-1">{artwork.maker}</p>
                      )}
                      {artwork.date && (
                        <p className="text-gray-500 text-xs mt-auto">{artwork.date}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingArtworks && artworks.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">🖼️</div>
                <p className="text-gray-600">No artworks available. Please import some first!</p>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                <p className="font-semibold mb-2">⚠️ Error Loading Artworks</p>
                <p>{error}</p>
                <div className="mt-4 space-y-2">
                  <button
                    onClick={testBackendConnection}
                    disabled={testingConnection}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testingConnection ? 'Testing...' : '🔍 Test Backend Connection'}
                  </button>
                  <p className="text-sm font-semibold mt-4">Troubleshooting steps:</p>
                  <ol className="list-decimal list-inside text-sm space-y-1 ml-4">
                    <li>Make sure the Django backend is running: <code className="bg-red-100 px-2 py-1 rounded">cd backend && python manage.py runserver</code></li>
                    <li>Check that the backend is accessible at <code className="bg-red-100 px-2 py-1 rounded">http://localhost:8000</code></li>
                    <li>Import artworks first: Visit <a href="http://localhost:8000/api/six_degrees/import_art/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">http://localhost:8000/api/six_degrees/import_art/</a></li>
                    <li>Check browser console (F12) for detailed error messages</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Artwork */}
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl shadow-xl p-8 mb-6 animate-fade-in">
              <div className="mb-6">
                <button 
                  className="bg-transparent border-2 border-indigo-500 text-indigo-600 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-indigo-500 hover:text-white hover:-translate-x-1 mb-4"
                  onClick={() => {
                    setSelectedArtwork(null);
                    setConnections([]);
                  }}
                >
                  ← Choose Different Artwork
                </button>
                <h2 className="text-3xl font-bold text-gray-800">Selected: {selectedArtwork.title || 'Untitled'}</h2>
              </div>

              {selectedArtwork.image_url && (
                <div className="w-full max-w-lg mx-auto my-6 rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                    className="w-full h-auto"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="space-y-2 text-gray-700">
                {selectedArtwork.maker && (
                  <p><strong>Maker:</strong> {selectedArtwork.maker}</p>
                )}
                {selectedArtwork.date && (
                  <p><strong>Date:</strong> {selectedArtwork.date}</p>
                )}
                {selectedArtwork.medium && (
                  <p><strong>Medium:</strong> {selectedArtwork.medium}</p>
                )}
              </div>
            </div>

            {/* Connected Artworks */}
            <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl shadow-xl p-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Connected Artworks</h2>
              
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                  <p className="mt-4 text-gray-600">Finding connections...</p>
                </div>
              )}

              {!loading && connections.length > 0 && (
                <>
                  <p className="text-gray-600 mb-6">
                    Found {connections.length} connected artwork{connections.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {connections.map((artwork) => (
                      <div
                        key={artwork.id || artwork.object_id}
                        className="bg-white rounded-2xl overflow-hidden shadow-lg flex flex-col"
                      >
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center overflow-hidden relative">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title || 'Artwork'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-full h-full hidden items-center justify-center text-6xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                            style={{ display: artwork.image_url ? 'none' : 'flex' }}
                          >
                            🎨
                          </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                            {artwork.title || 'Untitled'}
                          </h3>
                          {artwork.maker && (
                            <p className="text-indigo-600 text-sm font-medium mb-1">{artwork.maker}</p>
                          )}
                          {artwork.date && (
                            <p className="text-gray-500 text-xs mt-auto">{artwork.date}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!loading && connections.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50">🔗</div>
                  <p className="text-gray-600">No connections found for this artwork.</p>
                </div>
              )}

              {error && (
                <div className="mt-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
                  {error}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ArtPathFinder;
