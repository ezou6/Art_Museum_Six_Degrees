import React, { useState, useEffect } from 'react';
import './ArtPathFinder.css';

const ArtPathFinder = ({ onBack }) => {
  const [artworks, setArtworks] = useState([]);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [connections, setConnections] = useState([]);
  const [targetArtwork, setTargetArtwork] = useState(null);
  const [targetDistance, setTargetDistance] = useState(null);
  const [startingArtwork, setStartingArtwork] = useState(null); // Track the initial starting artwork
  const [loading, setLoading] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [error, setError] = useState(null);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const [navigationStack, setNavigationStack] = useState([]); // Track navigation path

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

  useEffect(() => {
const fetchArtworks = async () => {
      try {
        let allArtworks = [];
        
        try {
          const artworksResponse = await fetch('http://localhost:8000/api/six_degrees/artworks/');
          
          if (!artworksResponse.ok) {
            throw new Error(`HTTP error! status: ${artworksResponse.status}`);
          }
          
          const artworksData = await artworksResponse.json();
          
          if (artworksData.artworks && Array.isArray(artworksData.artworks)) {
            allArtworks = artworksData.artworks.map(art => ({
              ...art,
              image_url: convertImageUrl(art.image_url)
            }));
          }
        } catch (artworksErr) {
          console.warn('Artworks endpoint failed, trying graph endpoint:', artworksErr);
        }
        
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
                image_url: convertImageUrl(node.image_url),
              }));
            }
          } catch (graphErr) {
            console.warn('Graph endpoint also failed:', graphErr);
          }
        }
        
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
        setError(`Failed to load artworks: ${err.message}. Make sure the backend is running on http://localhost:8000. Run: cd backend && python manage.py runserver`);
        setLoadingArtworks(false);
      }
    };
    
    fetchArtworks();
  }, []);

  // Helper function to update target distance
  const updateTargetDistance = async (currentId, targetId) => {
    if (!targetId || !currentId) return;
    
    try {
      const distanceResponse = await fetch(`http://localhost:8000/api/six_degrees/artworks/${currentId}/distance/${targetId}/`);
      if (distanceResponse.ok) {
        const distanceData = await distanceResponse.json();
        if (distanceData.has_path) {
          setTargetDistance(distanceData.distance);
        } else {
          setTargetDistance(null);
        }
      }
    } catch (err) {
      console.warn('Error fetching distance:', err);
      setTargetDistance(null);
    }
  };

  const handleArtworkSelect = async (artwork, addToStack = true) => {
    // Add to navigation stack if we're navigating from a connection (and not going back)
    if (selectedArtwork && addToStack) {
      setNavigationStack([...navigationStack, selectedArtwork]);
    }
    
    // If this is the first selection (no starting artwork set), set it and fetch target
    const isFirstSelection = !startingArtwork;
    if (isFirstSelection) {
      setStartingArtwork(artwork);
    }
    
    // Ensure artwork image URL is converted
    const artworkWithConvertedUrl = {
      ...artwork,
      image_url: convertImageUrl(artwork.image_url)
    };
    
    setSelectedArtwork(artworkWithConvertedUrl);
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
        .filter(node => node.image_url) // Only include connections with images
        .map(node => ({
          id: node.id || node.object_id,
          object_id: node.id || node.object_id,
          title: node.title || node.label,
          maker: node.maker,
          date: node.date,
          medium: node.medium,
          image_url: convertImageUrl(node.image_url), // Convert IIIF URLs
        }))
        .slice(0, 6); // Limit to 6 connections

      setConnections(connectedArtworks);
      
      // Fetch target artwork (4-9 steps away) only if this is the first selection
      if (isFirstSelection) {
        setLoadingTarget(true);
        try {
          const targetResponse = await fetch(`http://localhost:8000/api/six_degrees/artworks/${artwork.id || artwork.object_id}/target/`);
          if (targetResponse.ok) {
            const targetData = await targetResponse.json();
            if (targetData.error) {
              console.warn('Could not find target artwork:', targetData.error);
            } else {
              // Ensure target image URL is converted
              const targetWithConvertedUrl = {
                ...targetData,
                image_url: convertImageUrl(targetData.image_url)
              };
              setTargetArtwork(targetWithConvertedUrl);
              // Calculate initial distance
              updateTargetDistance(artwork.id || artwork.object_id, targetData.id || targetData.object_id);
            }
          }
        } catch (targetErr) {
          console.warn('Error fetching target artwork:', targetErr);
        } finally {
          setLoadingTarget(false);
        }
      } else if (targetArtwork) {
        // Update distance when navigating to a new artwork
        updateTargetDistance(artwork.id || artwork.object_id, targetArtwork.id || targetArtwork.object_id);
      }
      
      // Clear error if we successfully got connections (even if empty)
      setError(null);
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
      className="art-path-finder"
      style={{
        backgroundImage: `url(${backgroundImage})`
      }}
    >
      <div className="art-path-finder-content">
        {/* Header */}
        <div className="app-header">
          <h1>🎨 Art Path Finder</h1>
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
        </div>

        {!selectedArtwork ? (
          <div className="card">
            <div className="card-header">
              <div className="card-header-left">
                <h2>Choose Your Starting Artwork</h2>
                <p className="subtitle">Select an artwork to discover its connections</p>
              </div>
              {!loadingArtworks && artworks.length > 0 && (
                <div className="artwork-count">
                  {artworks.length} Artwork{artworks.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {loadingArtworks && (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Loading artworks...</p>
              </div>
            )}

            {!loadingArtworks && artworks.length > 0 && (
              <div className="artwork-grid">
                {artworks.map((artwork) => (
                  <div
                    key={artwork.id || artwork.object_id}
                    className="artwork-card"
                    onClick={() => handleArtworkSelect(artwork)}
                  >
                    <div className="artwork-card-image">
                      {artwork.image_url ? (
                        <img
                          src={artwork.image_url}
                          alt={artwork.title || 'Artwork'}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="artwork-card-placeholder"
                        style={{ display: artwork.image_url ? 'none' : 'flex' }}
                      >
                        🎨
                      </div>
                    </div>
                    <div className="artwork-card-content">
                      <h3>{artwork.title || 'Untitled'}</h3>
                      {artwork.maker && (
                        <p className="artwork-maker">{artwork.maker}</p>
                      )}
                      {artwork.date && (
                        <p className="artwork-date">{artwork.date}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingArtworks && artworks.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">🖼️</div>
                <p>No artworks available. Please import some first!</p>
              </div>
            )}

            {error && (
              <div className="error-message">
                <p><strong>⚠️ Error Loading Artworks</strong></p>
                <p>{error}</p>
                <div className="troubleshooting-steps">
                  <button
                    onClick={testBackendConnection}
                    disabled={testingConnection}
                    className="test-connection-btn"
                  >
                    {testingConnection ? 'Testing...' : '🔍 Test Backend Connection'}
                  </button>
                  <p>Troubleshooting steps:</p>
                  <ol>
                    <li>Make sure the Django backend is running: <code>cd backend && python manage.py runserver</code></li>
                    <li>Check that the backend is accessible at <code>http://localhost:8000</code></li>
                    <li>Import artworks first: Visit <a href="http://localhost:8000/api/six_degrees/import_art/" target="_blank" rel="noopener noreferrer">http://localhost:8000/api/six_degrees/import_art/</a></li>
                    <li>Check browser console (F12) for detailed error messages</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Artwork */}
            <div className="card">
              <div className="selected-artwork-header">
                <button 
                  className="back-to-selection-btn"
                  onClick={() => {
                    setSelectedArtwork(null);
                    setConnections([]);
                  }}
                >
                  ← Choose Different Artwork
                </button>
                <h2>Selected: {selectedArtwork.title || 'Untitled'}</h2>
</div>

              {selectedArtwork.image_url && (
                <div className="selected-artwork-image">
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="selected-artwork-details">
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
            <div className="card">
              <h2>Connected Artworks</h2>
              
              {loading && (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Finding connections...</p>
                </div>
              )}

              {!loading && connections.length > 0 && (
                <>
                  <p className="subtitle">
                    Found {connections.length} connected artwork{connections.length !== 1 ? 's' : ''}
                  </p>
                  <div className="artwork-grid">
                    {connections.map((artwork) => (
                      <div
                        key={artwork.id || artwork.object_id}
                        className="artwork-card"
>
                        <div className="artwork-card-image">
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title || 'Artwork'}
onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="artwork-card-placeholder"
                            style={{ display: artwork.image_url ? 'none' : 'flex' }}
                          >
                            🎨
                          </div>
                        </div>
                        <div className="artwork-card-content">
                          <h3>{artwork.title || 'Untitled'}</h3>
                          {artwork.maker && (
                            <p className="artwork-maker">{artwork.maker}</p>
                          )}
                          {artwork.date && (
                            <p className="artwork-date">{artwork.date}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {!loading && connections.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon">🔗</div>
                  <p>No connections found for this artwork.</p>
                </div>
              )}

              {error && (
                <div className="error-message">
                  <p>{error}</p>
                </div>
              )}
            </div>

            {/* Target Artwork Section */}
            {targetArtwork && startingArtwork && (
              <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-3xl shadow-xl p-8 mt-6 animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">🎯 Your Target</h2>
                <p className="text-gray-600 mb-6">
                  {targetDistance !== null ? (
                    <>
                      You are currently <strong className="text-indigo-600">{targetDistance} connection{targetDistance !== 1 ? 's' : ''}</strong> away from the target.
                      {targetDistance === 0 ? ' 🎉 You found it!' : ' Can you find the path?'}
                    </>
                  ) : (
                    <>
                      This artwork is 4-9 connections away from your starting artwork ({startingArtwork.title || 'Untitled'}). Can you find the path?
                    </>
                  )}
                </p>
                
                {loadingTarget ? (
                  <div className="text-center py-12">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="mt-4 text-gray-600">Finding target artwork...</p>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border-2 border-yellow-300">
                    <div className="flex flex-col md:flex-row gap-6">
                      {targetArtwork.image_url ? (
                        <div className="w-full md:w-64 h-64 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-gray-100">
                          <img
                            src={targetArtwork.image_url}
                            alt={targetArtwork.title || 'Target Artwork'}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div 
                            className="w-full h-full hidden items-center justify-center text-6xl bg-gradient-to-br from-yellow-500 to-orange-600 text-white"
                            style={{ display: 'none' }}
                          >
                            🎯
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-64 h-64 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-6xl text-white">
                          🎯
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">
                          {targetArtwork.title || 'Untitled'}
                        </h3>
                        {targetArtwork.maker && (
                          <p className="text-indigo-600 text-lg font-medium mb-2">
                            {targetArtwork.maker}
                          </p>
                        )}
                        {targetArtwork.date && (
                          <p className="text-gray-600 mb-2"><strong>Date:</strong> {targetArtwork.date}</p>
                        )}
                        {targetArtwork.medium && (
                          <p className="text-gray-600 mb-2"><strong>Medium:</strong> {targetArtwork.medium}</p>
                        )}
                        {targetArtwork.department && (
                          <p className="text-gray-600"><strong>Department:</strong> {targetArtwork.department}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtPathFinder;
