import React, { useState, useEffect } from 'react';
import './ArtPathFinder.css';

// Dijkstra's algorithm implementation for finding shortest path
function findShortestPath(nodes, edges, startId, endId) {
  // Normalize IDs to strings for consistent comparison
  const startIdStr = String(startId);
  const endIdStr = String(endId);
  
  // Build adjacency list
  const graph = {};
  nodes.forEach(node => {
    const id = String(node.id || node.object_id);
    graph[id] = [];
  });

  edges.forEach(edge => {
    const from = String(edge.source || edge[0]);
    const to = String(edge.target || edge[1]);
    const weight = edge.weight || 1;
    
    if (graph[from] && graph[to]) {
      graph[from].push({ node: to, weight });
      graph[to].push({ node: from, weight });
    }
  });

  // Check if start and end nodes exist
  if (!graph[startIdStr] || !graph[endIdStr]) {
    return null;
  }

  // Dijkstra's algorithm
  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph));

  Object.keys(graph).forEach(nodeId => {
    distances[nodeId] = Infinity;
    previous[nodeId] = null;
  });

  distances[startIdStr] = 0;

  while (unvisited.size > 0) {
    // Find unvisited node with smallest distance
    let current = null;
    let minDist = Infinity;
    
    unvisited.forEach(nodeId => {
      const dist = distances[nodeId];
      if (dist < minDist) {
        minDist = dist;
        current = nodeId;
      }
    });

    if (current === null || minDist === Infinity) break;
    if (current === endIdStr) break;

    unvisited.delete(current);

    // Update distances to neighbors
    graph[current].forEach(neighbor => {
      const alt = distances[current] + neighbor.weight;
      if (alt < distances[neighbor.node]) {
        distances[neighbor.node] = alt;
        previous[neighbor.node] = current;
      }
    });
  }

  // Reconstruct path
  if (distances[endIdStr] === Infinity) {
    return null;
  }

  const path = [];
  let current = endIdStr;
  while (current !== null) {
    path.unshift(parseInt(current));
    current = previous[current];
  }

  return path;
}

const ArtPathFinder = ({ onBack }) => {
  const [artworks, setArtworks] = useState([]);
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [path, setPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingArtworks, setLoadingArtworks] = useState(true);

  useEffect(() => {
    // Fetch artworks from backend
    fetch('http://localhost:8000/api/six_degrees/artworks/')
      .then(res => res.json())
      .then(data => {
        if (data.artworks) {
          setArtworks(data.artworks);
        } else if (data.nodes) {
          // If graph format, extract node data
          setArtworks(data.nodes.map(node => ({
            id: node.id || node.object_id,
            object_id: node.id || node.object_id,
            title: node.title,
            maker: node.maker,
            date: node.date,
            medium: node.medium,
            image_url: node.image_url,
          })));
        } else if (Array.isArray(data)) {
          setArtworks(data);
        }
        setLoadingArtworks(false);
      })
      .catch(err => {
        console.error('Error fetching artworks:', err);
        setError('Failed to load artworks. Please check your backend connection.');
        setLoadingArtworks(false);
      });
  }, []);

  const handleFindPath = async () => {
    if (!startId || !endId) {
      setError('Please select both start and end artworks');
      return;
    }

    setLoading(true);
    setError(null);
    setPath(null);

    try {
      // Get graph data and find path using Dijkstra's algorithm on the frontend
      const graphResponse = await fetch('http://localhost:8000/api/six_degrees/art_graph/');
      const graphData = await graphResponse.json();
      
      if (!graphData.nodes || !graphData.edges) {
        throw new Error('Invalid graph data format');
      }

      // Find path using Dijkstra's algorithm
      const path = findShortestPath(graphData.nodes, graphData.edges, parseInt(startId), parseInt(endId));
      
      if (path && path.length > 0) {
        // Convert node IDs to full artwork objects
        const pathArtworks = path.map(nodeId => {
          const node = graphData.nodes.find(n => {
            const nodeIdValue = n.id || n.object_id;
            return String(nodeIdValue) === String(nodeId);
          });
          return node || { 
            id: nodeId, 
            object_id: nodeId,
            title: graphData.nodes.find(n => String(n.id || n.object_id) === String(nodeId))?.label || `Artwork ${nodeId}`,
            maker: graphData.nodes.find(n => String(n.id || n.object_id) === String(nodeId))?.maker || null,
            image_url: graphData.nodes.find(n => String(n.id || n.object_id) === String(nodeId))?.image_url || null,
          };
        });
        setPath(pathArtworks);
      } else {
        setError('No path found between these artworks');
      }
    } catch (err) {
      console.error('Error finding path:', err);
      setError('Failed to find path. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="art-path-finder">
      <div className="main-container">
        <div className="app-header">
          <h1>🎨 Art Path Finder</h1>
          <button className="back-button" onClick={onBack}>
            ← Back to Home
          </button>
        </div>

        <div className="card fade-in">
          <h2>Find Your Path</h2>
          <p className="subtitle">Select two artworks to discover the shortest connection between them</p>

          <div className="grid grid-2">
            <div className="input-group">
              <label htmlFor="start-artwork">Starting Artwork</label>
              <select
                id="start-artwork"
                value={startId}
                onChange={(e) => setStartId(e.target.value)}
                disabled={loadingArtworks}
              >
                <option value="">Select an artwork...</option>
                {artworks.map((artwork) => (
                  <option key={artwork.id || artwork.object_id} value={artwork.id || artwork.object_id}>
                    {artwork.title || 'Untitled'} {artwork.maker ? `by ${artwork.maker}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="end-artwork">Destination Artwork</label>
              <select
                id="end-artwork"
                value={endId}
                onChange={(e) => setEndId(e.target.value)}
                disabled={loadingArtworks}
              >
                <option value="">Select an artwork...</option>
                {artworks.map((artwork) => (
                  <option key={artwork.id || artwork.object_id} value={artwork.id || artwork.object_id}>
                    {artwork.title || 'Untitled'} {artwork.maker ? `by ${artwork.maker}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingArtworks && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner"></div>
              <p style={{ marginTop: '1rem', color: '#666' }}>Loading artworks...</p>
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleFindPath}
            disabled={loading || !startId || !endId || loadingArtworks}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: '20px', height: '20px', borderWidth: '2px', marginRight: '10px' }}></span>
                Finding Path...
              </>
            ) : (
              'Find Path'
            )}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        {path && path.length > 0 && (
          <div className="card path-container fade-in">
            <h2>Path Found! 🎉</h2>
            <p className="subtitle">
              Discovered a path with {path.length} connection{path.length !== 1 ? 's' : ''}
            </p>
            <div className="path-list">
              {path.map((artwork, index) => (
                <div key={artwork.id || artwork.object_id || index} className="path-item slide-in" style={{ animationDelay: `${index * 0.1}s` }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span className="path-number">{index + 1}</span>
                    <h3>{artwork.title || 'Untitled'}</h3>
                  </div>
                  {artwork.maker && (
                    <p><strong>Maker:</strong> {artwork.maker}</p>
                  )}
                  {artwork.date && (
                    <p><strong>Date:</strong> {artwork.date}</p>
                  )}
                  {artwork.medium && (
                    <p><strong>Medium:</strong> {artwork.medium}</p>
                  )}
                  {artwork.department && (
                    <p><strong>Department:</strong> {artwork.department}</p>
                  )}
                  {artwork.image_url && (
                    <div style={{ marginTop: '1rem' }}>
                      <img
                        src={artwork.image_url}
                        alt={artwork.title}
                        style={{
                          maxWidth: '100%',
                          borderRadius: '12px',
                          boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!loadingArtworks && artworks.length === 0 && (
          <div className="card">
            <p>No artworks available. Please import some first!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtPathFinder;

