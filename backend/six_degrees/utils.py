import networkx as nx
from collections import Counter
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
from django.core.cache import cache
from .models import ArtObject
import random
import heapq

WEIGHTS = {
    "artist": 0.3,
    "style": 0.2,
    "material": 0.1,
    "period": 0.1,
    "text": 0.15,
    "department": 0.2
}

MAX_EDGES_PER_NODE = 5
CACHE_KEY = "art_graph_json"
CACHE_TIMEOUT = 60 * 60 * 6  # 6 hours

# -------------------------
# Helper similarity functions
# -------------------------
def similarity_artist(a, b):
    if a.maker and b.maker:
        return 1.0 if a.maker == b.maker else 0.0
    return 0.0

def similarity_style(a, b):
    return 1.0 if a.classification and a.classification == b.classification else 0.0

def similarity_material(a, b, material_freq):
    if a.medium and b.medium and a.medium == b.medium:
        freq = material_freq[a.medium]
        return 1 / freq
    return 0.0

def similarity_period(a, b):
    # Optimization: Early return if dates are missing
    if not a.date or not b.date:
        return 0.0
    try:
        # Extract first 4 digits (year) more efficiently
        date_a = int(a.date[:4]) if len(a.date) >= 4 else None
        date_b = int(b.date[:4]) if len(b.date) >= 4 else None
        if date_a is None or date_b is None:
            return 0.0
        diff = abs(date_a - date_b)
        return max(0, 1 - diff / 100)
    except (ValueError, TypeError):
        return 0.0

def similarity_text(a, b):
    # Optimization: Check if embeddings exist before computing
    if not hasattr(a, 'embedding') or not hasattr(b, 'embedding'):
        return 0.0
    try:
        return float(cosine_similarity(a.embedding, b.embedding))
    except:
        return 0.0

def similarity_department(a, b):
    return 1.0 if a.department and a.department == b.department else 0.0

def compute_combined_similarity(a, b):
    contributions = {
        "Artist": WEIGHTS["artist"] * similarity_artist(a, b),
        "Style": WEIGHTS["style"] * similarity_style(a, b),
        "Period": WEIGHTS["period"] * similarity_period(a, b),
        "Text": WEIGHTS["text"] * similarity_text(a, b),
        "Department": WEIGHTS["department"] * similarity_department(a, b),
    }
    total_score = sum(contributions.values())
    dominant_relation = max(contributions, key=contributions.get)
    return total_score, dominant_relation

# -------------------------
# Main function
# -------------------------
def generate_art_graph(export_path=None):
    cached = cache.get(CACHE_KEY)
    if cached:
        return cached

    # Optimization: Use select_related/prefetch_related if needed, and filter in query
    artworks = list(ArtObject.objects.filter(title__isnull=False, maker__isnull=False).exclude(title='', maker=''))
    
    # Early return if no artworks
    if not artworks:
        return {"nodes": [], "edges": []}

    # Embeddings placeholder - vectorized generation
    # Optimization: Generate all embeddings at once if possible
    for a in artworks:
        np.random.seed(a.object_id)
        a.embedding = np.random.rand(1, 5)

    # Build graph
    G = nx.Graph()
    for a in artworks:
        G.add_node(a.object_id,
                   title=a.title,
                   maker=a.maker,
                   classification=a.classification,
                   medium=a.medium,
                   image_url=a.image_url,
                   date=a.date)

    # Add edges: only top MAX_EDGES_PER_NODE strongest connections
    # Optimization: Use min-heap to find top-k without full sort (O(n log k) instead of O(n log n))
    # This reduces complexity from O(n² log n) to O(n² log k) where k=MAX_EDGES_PER_NODE (5)
    for i, a in enumerate(artworks):
        # Use min-heap to keep only top MAX_EDGES_PER_NODE similarities
        # Heap stores (score, b, relation) - min-heap keeps smallest at top
        top_similarities = []
        
        for b in artworks[i+1:]:
            score, relation = compute_combined_similarity(a, b)
            
            # Skip zero similarities early to avoid unnecessary heap operations
            if score <= 0:
                continue
            
            # Maintain heap of size MAX_EDGES_PER_NODE
            if len(top_similarities) < MAX_EDGES_PER_NODE:
                heapq.heappush(top_similarities, (score, b, relation))
            elif score > top_similarities[0][0]:
                # Replace smallest element if current score is larger
                heapq.heapreplace(top_similarities, (score, b, relation))
        
        # Add edges from top similarities (heap is min-heap, so sort for descending order)
        # Only need to sort k elements (5), not n elements
        for score, b, relation in sorted(top_similarities, reverse=True):
            G.add_edge(a.object_id, b.object_id, weight=score, relation=relation)

    # Helper function to convert IIIF URLs
    def convert_iiif_url(uri):
        if not uri:
            return None
        if '/full/' in uri or uri.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            return uri
        if '/iiif/' in uri:
            return uri.rstrip('/') + '/full/800,/0/default.jpg'
        return uri
    
    export = {
        "nodes": [
            {
                "id": n,
                "object_id": n,
                "title": G.nodes[n]["title"],
                "label": G.nodes[n]["title"],
                "maker": G.nodes[n]["maker"],
                "image_url": convert_iiif_url(G.nodes[n]["image_url"]),
                "date": G.nodes[n].get("date"),
                "medium": G.nodes[n].get("medium"),
                "classification": G.nodes[n].get("classification"),
            } for n in G.nodes
        ],
        "edges": [
            {"source": u, "target": v, "weight": d["weight"], "relation": d["relation"]}
            for u, v, d in G.edges(data=True)
        ]
    }

    if export_path:
        with open(export_path, "w") as f:
            json.dump(export, f, indent=2)

    cache.set(CACHE_KEY, export, CACHE_TIMEOUT)
    return export

def get_target_artwork(start_id, steps=6):
    """
    Find a target artwork that is exactly 'steps' connections away from the start.
    Uses BFS to find all nodes at exactly the specified distance, then picks one randomly.
    """
    graph_data = generate_art_graph()
    G = nx.Graph()
    for node in graph_data["nodes"]:
        G.add_node(node["id"], **node)
    for edge in graph_data["edges"]:
        G.add_edge(edge["source"], edge["target"], **edge)

    if start_id not in G:
        return None

    # Use BFS to find all nodes at exactly 'steps' distance
    from collections import deque
    
    queue = deque([(start_id, 0)])  # (node, distance)
    visited = {start_id: 0}  # node -> distance
    nodes_at_target_distance = []
    
    while queue:
        current, dist = queue.popleft()
        
        if dist == steps:
            # Found a node at exactly the target distance
            if current not in nodes_at_target_distance:
                nodes_at_target_distance.append(current)
            continue
        elif dist > steps:
            # We've gone too far, stop exploring this branch
            continue
        
        # Explore neighbors
        for neighbor in G.neighbors(current):
            new_dist = dist + 1
            # Only add if we haven't visited this node, or if we found a shorter path
            if neighbor not in visited or visited[neighbor] > new_dist:
                visited[neighbor] = new_dist
                queue.append((neighbor, new_dist))
    
    if not nodes_at_target_distance:
        # If no nodes found at exactly 'steps' distance, try to find one close to it
        # Find nodes at distance steps-1 or steps+1 (prefer steps-1)
        fallback_nodes = []
        for node, node_dist in visited.items():
            if node_dist == steps - 1:
                fallback_nodes.append(node)
        
        if not fallback_nodes:
            # Try steps+1 as last resort
            for node, node_dist in visited.items():
                if node_dist == steps + 1:
                    fallback_nodes.append(node)
        
        if not fallback_nodes:
            return None
        
        nodes_at_target_distance = fallback_nodes
    
    # Pick a random node from those at the target distance
    target_id = random.choice(nodes_at_target_distance)
    target_data = G.nodes[target_id]
    return target_data
