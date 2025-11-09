import React, { useState, useEffect } from 'react';
import EndPage from './EndPage';

const ArtPathFinder = ({ onBack, initialArtworks = [], onPlayAgain }) => {
  const [artworks, setArtworks] = useState(initialArtworks);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [connections, setConnections] = useState([]);
  const [targetArtwork, setTargetArtwork] = useState(null);
  const [targetDistance, setTargetDistance] = useState(null);
  const [startingArtwork, setStartingArtwork] = useState(null); // Track the initial starting artwork
  const [loading, setLoading] = useState(false);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [error, setError] = useState(null);
  const [loadingArtworks, setLoadingArtworks] = useState(initialArtworks.length === 0);
  const [testingConnection, setTestingConnection] = useState(false);
  const [navigationStack, setNavigationStack] = useState([]); // Track navigation path
  const [isWon, setIsWon] = useState(false); // Track if user has won
  const [hintConnectionId, setHintConnectionId] = useState(null); // Track which connection is the hint
  const [hintRevealed, setHintRevealed] = useState(false); // Track if hint has been revealed
  const [hintCount, setHintCount] = useState(0); // Track how many times user requested a hint

  const testBackendConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await fetch('http://localhost:8080/api/six_degrees/');
      if (response.ok) {
        const data = await response.json();
        alert(`✅ Backend is connected!\n\n${JSON.stringify(data, null, 2)}`);
      } else {
        alert(`❌ Backend returned error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      alert(`❌ Cannot connect to backend:\n\n${err.message}\n\nMake sure the Django server is running on http://localhost:8080`);
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

  useEffect(() => {
    // If initialArtworks are provided, use them directly (with converted image URLs)
    if (initialArtworks && initialArtworks.length > 0) {
      const artworksWithConvertedUrls = initialArtworks.map(art => ({
        ...art,
        image_url: convertImageUrl(art.image_url)
      }));
      setArtworks(artworksWithConvertedUrls);
      setLoadingArtworks(false);
      setError(null);
      return;
    }
    
    // Otherwise, fetch artworks from both endpoints to ensure we get all artworks
    const fetchArtworks = async () => {
      try {
        let allArtworks = [];
        
        // Try artworks endpoint first
        try {
          const artworksResponse = await fetch('http://localhost:8080/api/six_degrees/artworks/');
          
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
        
        // If artworks endpoint doesn't have data, try graph endpoint
        if (allArtworks.length === 0) {
          try {
            const graphResponse = await fetch('http://localhost:8080/api/six_degrees/art_graph/');
            
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
        
        // Remove duplicates based on ID
        const uniqueArtworks = Array.from(
          new Map(allArtworks.map(art => [art.id || art.object_id, art])).values()
        );
        
        if (uniqueArtworks.length === 0) {
          setError('No artworks found. Please import artworks first by visiting: http://localhost:8080/api/six_degrees/import_art/');
        } else {
          setArtworks(uniqueArtworks);
          setError(null);
        }
        
        setLoadingArtworks(false);
      } catch (err) {
        console.error('Error fetching artworks:', err);
        setError(`Failed to load artworks: ${err.message}. Make sure the backend is running on http://localhost:8080`);
        setLoadingArtworks(false);
      }
    };
    
    fetchArtworks();
  }, [initialArtworks]);

  // Helper function to update target distance
  const updateTargetDistance = React.useCallback(async (currentId, targetId) => {
    if (!targetId || !currentId) return;
    
    try {
      const distanceResponse = await fetch(`http://localhost:8080/api/six_degrees/artworks/${currentId}/distance/${targetId}/`);
      if (distanceResponse.ok) {
        const distanceData = await distanceResponse.json();
        if (distanceData.has_path) {
          const distance = distanceData.distance;
          setTargetDistance(distance);
          // Check if user won (distance is 0)
          if (distance === 0) {
            setIsWon(true);
          }
        } else {
          setTargetDistance(null);
        }
      }
    } catch (err) {
      console.warn('Error fetching distance:', err);
      setTargetDistance(null);
    }
  }, []);

  // Handle reset state when playing again
  const handleResetState = (artworksWithConvertedUrls) => {
    // Reset all state to start fresh
    setIsWon(false);
    setSelectedArtwork(null);
    setConnections([]);
    setTargetArtwork(null);
    setTargetDistance(null);
    setStartingArtwork(null);
    setNavigationStack([]);
    setError(null);
    setArtworks(artworksWithConvertedUrls);
  };

  const handleArtworkSelect = async (artwork, addToStack = true, relation = null) => {
    // Add to navigation stack if we're navigating from a connection (and not going back)
    // Store the relation between the previous artwork (selectedArtwork) and the current one (artwork)
    if (selectedArtwork && addToStack) {
      const artworkWithRelation = {
        ...selectedArtwork,
        relationToNext: relation // Store relation from this artwork to the next one
      };
      setNavigationStack([...navigationStack, artworkWithRelation]);
    }
    
    // If this is the first selection (no starting artwork set), set it and fetch target
    const isFirstSelection = !startingArtwork;
    if (isFirstSelection) {
      console.log('First selection detected, setting starting artwork:', artwork);
      setStartingArtwork(artwork);
      setHintCount(0); // Reset hint count when selecting a new starting artwork
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
      const graphResponse = await fetch('http://localhost:8080/api/six_degrees/art_graph/');
      
      if (!graphResponse.ok) {
        throw new Error(`HTTP error! status: ${graphResponse.status}`);
      }
      
      const graphData = await graphResponse.json();
      
      // Check if the response contains an error
      if (graphData.error) {
        throw new Error(graphData.error);
      }
      
      if (!graphData.nodes || !graphData.edges) {
        throw new Error('Invalid graph data format');
      }

      // Convert artwork ID to number for consistent comparison
      const artworkId = Number(artwork.id || artwork.object_id);
      
      // Validate artwork ID
      if (isNaN(artworkId)) {
        throw new Error(`Invalid artwork ID: ${artwork.id || artwork.object_id}`);
      }
      
      // Check if artwork exists in graph
      const artworkInGraph = graphData.nodes.some(node => {
        const nodeId = Number(node.id || node.object_id);
        return !isNaN(nodeId) && nodeId === artworkId;
      });
      
      if (!artworkInGraph) {
        console.warn(`Artwork ${artworkId} not found in graph. Graph may need to regenerate.`);
        setConnections([]);
        setError(`This artwork is not yet in the connection graph. Please try again in a moment.`);
        setLoading(false);
        
        // Still try to fetch target artwork even if not in graph
        if (isFirstSelection) {
          console.log('Artwork not in graph, but still attempting to fetch target artwork');
          setLoadingTarget(true);
          try {
            const targetResponse = await fetch(`http://localhost:8080/api/six_degrees/artworks/${artwork.id || artwork.object_id}/target/`);
            console.log('Target response status (artwork not in graph):', targetResponse.status, targetResponse.ok);
            if (targetResponse.ok) {
              const targetData = await targetResponse.json();
              console.log('Target data received (artwork not in graph):', targetData);
              if (targetData.error) {
                console.warn('Could not find target artwork:', targetData.error);
              } else {
                const targetWithConvertedUrl = {
                  ...targetData,
                  image_url: convertImageUrl(targetData.image_url)
                };
                console.log('Setting target artwork (artwork not in graph):', targetWithConvertedUrl);
                setTargetArtwork(targetWithConvertedUrl);
                updateTargetDistance(artwork.id || artwork.object_id, targetData.id || targetData.object_id);
              }
            } else {
              const errorText = await targetResponse.text();
              console.error('Target artwork fetch failed (artwork not in graph):', targetResponse.status, errorText);
            }
          } catch (targetErr) {
            console.error('Error fetching target artwork (artwork not in graph):', targetErr);
          } finally {
            setLoadingTarget(false);
          }
        }
        return;
      }
      
      // Map to store connection ID -> relation type
      const connectionRelations = new Map();
      
      graphData.edges.forEach(edge => {
        const source = Number(edge.source || edge[0]);
        const target = Number(edge.target || edge[1]);
        const relation = edge.relation || 'Unknown';
        
        // Only compare if both are valid numbers
        if (!isNaN(source) && !isNaN(target)) {
        if (source === artworkId) {
            connectionRelations.set(target, relation);
        } else if (target === artworkId) {
            connectionRelations.set(source, relation);
          }
        }
      });

      // Get IDs of artworks to exclude from connections:
      // 1. The current selected artwork (if navigating forward)
      // 2. All artworks in the navigation stack (to avoid showing artworks we've already visited)
      const excludeIds = new Set();
      if (selectedArtwork) {
        const currentId = Number(selectedArtwork.id || selectedArtwork.object_id);
        if (!isNaN(currentId)) {
          excludeIds.add(currentId);
        }
      }
      navigationStack.forEach(prevArtwork => {
        const prevId = Number(prevArtwork.id || prevArtwork.object_id);
        if (!isNaN(prevId)) {
          excludeIds.add(prevId);
        }
      });

      let connectedArtworks = graphData.nodes
        .filter(node => {
          const nodeId = Number(node.id || node.object_id);
          return !isNaN(nodeId) && connectionRelations.has(nodeId);
        })
        .filter(node => {
          // Exclude previous artworks and current artwork from connections
          const nodeId = Number(node.id || node.object_id);
          return !excludeIds.has(nodeId);
        })
        .filter(node => node.image_url) // Only include connections with images
        .map(node => {
          const nodeId = Number(node.id || node.object_id);
          return {
            id: node.id || node.object_id,
            object_id: node.id || node.object_id,
            title: node.title || node.label,
            maker: node.maker,
            date: node.date,
            medium: node.medium,
            image_url: convertImageUrl(node.image_url), // Convert IIIF URLs
            relation: connectionRelations.get(nodeId) || 'Unknown', // Add relation type
          };
        });

      // If we have a target artwork and current distance, prioritize connections that are
      // exactly one step closer or one step further from the target
      if (targetArtwork && targetArtwork.id && targetDistance !== null && targetDistance !== undefined) {
        try {
          // Calculate distances from each connection to the target
          const distancePromises = connectedArtworks.map(async (art) => {
            try {
              const distResponse = await fetch(
                `http://localhost:8080/api/six_degrees/artworks/${art.id}/distance/${targetArtwork.id || targetArtwork.object_id}/`
              );
              if (distResponse.ok) {
                const distData = await distResponse.json();
                return {
                  ...art,
                  distanceToTarget: distData.has_path ? distData.distance : Infinity
                };
              }
              return { ...art, distanceToTarget: Infinity };
            } catch (err) {
              return { ...art, distanceToTarget: Infinity };
            }
          });

          const artworksWithDistances = await Promise.all(distancePromises);
          
          // Filter to prioritize connections that are exactly one step closer or one step further
          const preferredDistance = targetDistance - 1; // One step closer
          const alternativeDistance = targetDistance + 1; // One step further
          
          // Separate connections into categories
          const closerConnections = artworksWithDistances.filter(art => 
            art.distanceToTarget === preferredDistance
          );
          
          const furtherConnections = artworksWithDistances.filter(art => 
            art.distanceToTarget === alternativeDistance
          );
          
          const otherConnections = artworksWithDistances.filter(art => 
            art.distanceToTarget !== preferredDistance && 
            art.distanceToTarget !== alternativeDistance &&
            art.distanceToTarget !== Infinity
          );
          
          // Build final connections list, ensuring EXACTLY ONE closer connection if available
          // IMPORTANT: The closer connection (hint) will be randomly placed in position 1-6
          const finalConnections = [];
          
          // GUARANTEE: Include EXACTLY ONE closer connection if any exist (randomly selected as hint)
          let hintConnection = null;
          if (closerConnections.length > 0) {
            // Randomly pick ONE of the closer connections as the hint
            const randomIndex = Math.floor(Math.random() * closerConnections.length);
            hintConnection = closerConnections[randomIndex];
            // Store the hint connection ID for highlighting
            setHintConnectionId(hintConnection.id || hintConnection.object_id);
            setHintRevealed(false); // Reset hint revealed state when new connections load
          } else {
            setHintConnectionId(null); // No hint available if no closer connections
            setHintRevealed(false);
          }
          
          // Build list of other connections (further and other) - we'll insert hint randomly
          const otherConnectionsList = [];
          
          // Add further connections
          otherConnectionsList.push(...furtherConnections);
          
          // Add other connections
          otherConnectionsList.push(...otherConnections);
          
          // Randomly select position for hint (0-5, which means 1st-6th position)
          let hintPosition = 6; // Default to last position
          if (hintConnection && otherConnectionsList.length > 0) {
            // Random position between 0 and min(5, otherConnectionsList.length)
            hintPosition = Math.floor(Math.random() * Math.min(6, otherConnectionsList.length + 1));
          }
          
          // Build final list: insert hint at random position
          if (hintConnection) {
            // Add connections before hint position
            finalConnections.push(...otherConnectionsList.slice(0, hintPosition));
            // Insert hint at random position
            finalConnections.push(hintConnection);
            // Add remaining connections after hint
            finalConnections.push(...otherConnectionsList.slice(hintPosition));
          } else {
            // No hint, just add all other connections
            finalConnections.push(...otherConnectionsList);
          }
          
          // Remove distanceToTarget from final objects and limit to 6
          connectedArtworks = finalConnections
            .slice(0, 6)
            .map(({ distanceToTarget, ...art }) => art);
        } catch (err) {
          console.warn('Error calculating distances to target, using random connections:', err);
          // Fallback to random selection if distance calculation fails
          connectedArtworks = connectedArtworks.slice(0, 6);
        }
      } else {
        // No target yet, just take first 6
        connectedArtworks = connectedArtworks.slice(0, 6);
      }

      setConnections(connectedArtworks);
      
      // Fetch target artwork (exactly 6 steps away) only if this is the first selection
      if (isFirstSelection) {
        console.log('Fetching target artwork for first selection, artwork ID:', artwork.id || artwork.object_id);
        setLoadingTarget(true);
        try {
          const targetResponse = await fetch(`http://localhost:8080/api/six_degrees/artworks/${artwork.id || artwork.object_id}/target/`);
          console.log('Target response status:', targetResponse.status, targetResponse.ok);
          if (targetResponse.ok) {
            const targetData = await targetResponse.json();
            console.log('Target data received:', targetData);
            if (targetData.error) {
              console.warn('Could not find target artwork:', targetData.error);
            } else {
              // Ensure target image URL is converted
              const targetWithConvertedUrl = {
                ...targetData,
                image_url: convertImageUrl(targetData.image_url)
              };
              console.log('Setting target artwork:', targetWithConvertedUrl);
              setTargetArtwork(targetWithConvertedUrl);
              // Calculate initial distance
              updateTargetDistance(artwork.id || artwork.object_id, targetData.id || targetData.object_id);
            }
          } else {
            const errorText = await targetResponse.text();
            console.error('Target artwork fetch failed:', targetResponse.status, errorText);
          }
        } catch (targetErr) {
          console.error('Error fetching target artwork:', targetErr);
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
      setError(`Failed to load connections: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen py-8 bg-black relative"
    >
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hint Button - Top Right (Permanent) */}
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => {
              if (hintConnectionId && !hintRevealed && selectedArtwork && targetArtwork && targetDistance !== null && targetDistance > 0) {
                setHintRevealed(true);
                setHintCount(prev => prev + 1);
              }
            }}
            disabled={!hintConnectionId || hintRevealed || !selectedArtwork || !targetArtwork || targetDistance === null || targetDistance === 0}
            className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl hover:shadow-yellow-500/50 hover:scale-105 active:scale-100 border-2 border-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-none"
            title={hintConnectionId && !hintRevealed ? "Click to reveal which artwork gets you closer to the target" : hintRevealed ? "Hint already revealed" : "No hint available"}
          >
            💡 Hint {hintCount > 0 && `(${hintCount})`}
          </button>
        </div>

        {/* Header */}
        <div className="p-6 mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">
            Six Degrees
          </h1>
          <button 
            className="bg-gradient-to-r from-white-400 to-white-300 text-gray-900 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            onClick={onBack}
          >
            ← Back to Home
          </button>
        </div>

        {/* You Won! End Page */}
        {isWon && (
          <EndPage
            startingArtwork={startingArtwork}
            targetArtwork={targetArtwork}
            selectedArtwork={selectedArtwork}
            navigationStack={navigationStack}
            onPlayAgain={onPlayAgain}
            onResetState={handleResetState}
          />
        )}

        {/* Regular Game View - only show if not won */}
        {!isWon && (
          <>
            {!selectedArtwork ? (
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-4xl font-bold text-white mb-2">
                      Choose a Starting Point
                    </h2>
                    <p className="text-gray-300 text-lg">
                      Select an artwork from these randomly selected pieces to discover its connections
                    </p>
              </div>
              {!loadingArtworks && artworks.length > 0 && (
                    <div className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold">
                  {artworks.length} Artwork{artworks.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {loadingArtworks && (
              <div className="text-center py-12">
                    <div className="inline-block w-10 h-10 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                    <p className="mt-4 text-white">Loading artworks...</p>
              </div>
            )}

            {!loadingArtworks && artworks.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {artworks.map((artwork) => (
                  <div
                    key={artwork.id || artwork.object_id}
                        className="cursor-pointer transition-all duration-300 hover:opacity-80 group"
                    onClick={() => handleArtworkSelect(artwork)}
                  >
                        <div className="w-full h-96 bg-gray-900 flex items-center justify-center overflow-hidden relative mb-4">
                      {artwork.image_url ? (
                        <img
                          src={artwork.image_url}
                          alt={artwork.title || 'Artwork'}
                              className="w-full h-full object-contain transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                            className="w-full h-full hidden items-center justify-center text-6xl bg-gray-800 text-white"
                        style={{ display: artwork.image_url ? 'none' : 'flex' }}
                      >
                        🎨
                      </div>
                    </div>
                        <div className="text-white">
                          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                        {artwork.title || 'Untitled'}
                      </h3>
                      {artwork.maker && (
                            <p className="text-gray-300 text-sm mb-1">{artwork.maker}</p>
                      )}
                      {artwork.date && (
                            <p className="text-gray-400 text-xs">{artwork.date}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingArtworks && artworks.length === 0 && (
              <div className="text-center py-12">
                    <div className="text-6xl mb-4 opacity-50 text-white">🖼️</div>
                    <p className="text-white">No artworks available. Please import some first!</p>
              </div>
            )}

            {error && (
                  <div className="mt-6 bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded">
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
                        <li>Make sure the Django backend is running: <code className="bg-red-800 px-2 py-1 rounded">cd backend && python manage.py runserver</code></li>
                        <li>Check that the backend is accessible at <code className="bg-red-800 px-2 py-1 rounded">http://localhost:8080</code></li>
                        <li>Import artworks first: Visit <a href="http://localhost:8080/api/six_degrees/import_art/" target="_blank" rel="noopener noreferrer" className="text-red-300 underline">http://localhost:8080/api/six_degrees/import_art/</a></li>
                    <li>Check browser console (F12) for detailed error messages</li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Artwork */}
            <div className="p-8 mb-6">
              <div className="mb-6">
                <div className="flex gap-2 mb-4">
                  {navigationStack.length > 0 ? (
                    <button
                      className="bg-transparent border-2 border-white text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-black hover:-translate-x-1"
                      onClick={() => {
                        const previous = navigationStack[navigationStack.length - 1];
                        setNavigationStack(navigationStack.slice(0, -1));
                        handleArtworkSelect(previous, false); // Don't add to stack when going back
                      }}
                    >
                      ← Back
                    </button>
                  ) : null}
                <button 
                    className="bg-transparent border-2 border-white text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-black hover:-translate-x-1"
                  onClick={() => {
                    setSelectedArtwork(null);
                    setConnections([]);
                      setTargetArtwork(null);
                      setStartingArtwork(null);
                      setNavigationStack([]);
                  }}
                >
                  ← Choose Different Artwork
                </button>
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">{selectedArtwork.title || 'Untitled'}</h2>
              </div>

              {selectedArtwork.image_url && (
                <div className="w-full max-w-2xl mx-auto my-6">
                  <div className="w-full h-96 bg-gray-900 flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedArtwork.image_url}
                    alt={selectedArtwork.title}
                      className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  </div>
                </div>
              )}

              <div className="space-y-2 text-white">
                {selectedArtwork.maker && (
                  <p className="text-lg"><strong>Maker:</strong> {selectedArtwork.maker}</p>
                )}
                {selectedArtwork.date && (
                  <p className="text-lg"><strong>Date:</strong> {selectedArtwork.date}</p>
                )}
                {selectedArtwork.medium && (
                  <p className="text-lg"><strong>Medium:</strong> {selectedArtwork.medium}</p>
                )}
              </div>
            </div>

            {/* Connected Artworks */}
            <div className="p-8">
              <h2 className="text-4xl font-bold text-white mb-4">Connected Artworks</h2>
              
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                  <p className="mt-4 text-white">Finding connections...</p>
                </div>
              )}

              {!loading && connections.length > 0 && (
                <>
                  <p className="text-gray-300 mb-8 text-lg">
                    Found {connections.length} connected artwork{connections.length !== 1 ? 's' : ''}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {connections.map((artwork) => {
                      const isHint = hintRevealed && (artwork.id || artwork.object_id) === hintConnectionId;
                      return (
                      <div
                        key={artwork.id || artwork.object_id}
                        className={`cursor-pointer transition-all duration-300 hover:opacity-80 group ${
                          isHint ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-black rounded-xl animate-pulse' : ''
                        }`}
                        onClick={() => handleArtworkSelect(artwork, true, artwork.relation)}
                      >
                        <div className={`w-full h-96 bg-gray-900 flex items-center justify-center overflow-hidden relative mb-4 ${isHint ? 'bg-yellow-900/20' : ''}`}>
                          {artwork.image_url ? (
                            <img
                              src={artwork.image_url}
                              alt={artwork.title || 'Artwork'}
                              className="w-full h-full object-contain transition-transform duration-300"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-full h-full hidden items-center justify-center text-6xl bg-gray-800 text-white"
                            style={{ display: artwork.image_url ? 'none' : 'flex' }}
                          >
                            🎨
                          </div>
                          {isHint && (
                            <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 px-3 py-1 rounded-full font-bold text-sm shadow-lg animate-bounce">
                              💡 Hint!
                            </div>
                          )}
                        </div>
                        <div className="text-white">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className={`text-lg font-semibold line-clamp-2 flex-1 ${isHint ? 'text-yellow-400' : ''}`}>
                            {artwork.title || 'Untitled'}
                          </h3>
                            {artwork.relation && (
                              <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0 ${isHint ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-white'}`} title={`Connected by: ${formatRelation(artwork.relation)}`}>
                                {formatRelation(artwork.relation)}
                              </span>
                            )}
                          </div>
                          {artwork.maker && (
                            <p className={`text-sm mb-1 ${isHint ? 'text-yellow-300' : 'text-gray-300'}`}>{artwork.maker}</p>
                          )}
                          {artwork.date && (
                            <p className={`text-xs ${isHint ? 'text-yellow-200' : 'text-gray-400'}`}>{artwork.date}</p>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </>
              )}

              {!loading && connections.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4 opacity-50 text-white">🔗</div>
                  <p className="text-white">No connections found for this artwork.</p>
                </div>
              )}

              {error && (
                <div className="mt-6 bg-red-900 border-l-4 border-red-500 text-red-100 p-4 rounded">
                  {error}
                </div>
              )}
            </div>

            {/* Target Artwork Section */}
            {(() => {
              console.log('Target artwork render check:', { 
                hasTargetArtwork: !!targetArtwork, 
                hasStartingArtwork: !!startingArtwork,
                targetArtwork,
                startingArtwork 
              });
              return null;
            })()}
            {targetArtwork && startingArtwork && (
              <div className="p-8 mt-6">
                <h2 className="text-4xl font-bold text-white mb-4">Your Target</h2>
                <p className="text-gray-300 mb-8 text-lg">
                  {targetDistance !== null ? (
                    <>
                      You are currently <strong className="text-yellow-400">{targetDistance} connection{targetDistance !== 1 ? 's' : ''}</strong> away from the target.
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
                    <div className="inline-block w-10 h-10 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                    <p className="mt-4 text-white">Finding target artwork...</p>
                  </div>
                ) : (
                  <div className="border-2 border-yellow-400 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {targetArtwork.image_url ? (
                        <div className="w-full md:w-96 h-96 bg-gray-900 flex items-center justify-center overflow-hidden flex-shrink-0">
                          <img
                            src={targetArtwork.image_url}
                            alt={targetArtwork.title || 'Target Artwork'}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) {
                                e.target.nextSibling.style.display = 'flex';
                              }
                            }}
                          />
                          <div
                            className="w-full h-full hidden items-center justify-center text-6xl bg-gray-800 text-white"
                            style={{ display: 'none' }}
                          >
                            🎨
                          </div>
                        </div>
                      ) : (
                        <div className="w-full md:w-96 h-96 bg-gray-800 flex items-center justify-center text-6xl text-white">
                          🎨
                        </div>
                      )}
                      <div className="flex-1 text-white">
                        <h3 className="text-2xl font-bold mb-3">
                          {targetArtwork.title || 'Untitled'}
                        </h3>
                        {targetArtwork.maker && (
                          <p className="text-gray-300 text-lg font-medium mb-2">
                            {targetArtwork.maker}
                          </p>
                        )}
                        {targetArtwork.date && (
                          <p className="text-gray-300 mb-2 text-lg"><strong>Date:</strong> {targetArtwork.date}</p>
                        )}
                        {targetArtwork.medium && (
                          <p className="text-gray-300 mb-2 text-lg"><strong>Medium:</strong> {targetArtwork.medium}</p>
                        )}
                        {targetArtwork.department && (
                          <p className="text-gray-300 text-lg"><strong>Department:</strong> {targetArtwork.department}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </>
          )}
          </>
        )}
      </div>
    </div>
  );
};

export default ArtPathFinder;
