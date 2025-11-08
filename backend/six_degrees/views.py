from django.shortcuts import render

# Create your views here.
"""
Degrees of Separation — Django Version
--------------------------------------
Builds a graph of ArtObjects and their connections using NetworkX.
Integrates with your tigerapp.models.ArtObject and Maker.
"""

import networkx as nx
from collections import Counter
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
from tigerapp.models import ArtObject, Maker

# -----------------------------------------------------
# 1. Load ArtObjects from database
# -----------------------------------------------------

artworks = list(ArtObject.objects.select_related('maker').all())

# Skip artworks without maker or title if needed
artworks = [a for a in artworks if a.title and a.maker]

# -----------------------------------------------------
# 2. Preprocess
# -----------------------------------------------------

# Count how often each medium appears
material_freq = Counter(a.medium for a in artworks if a.medium)

# Fake embeddings placeholder (replace with real text embeddings)
for a in artworks:
    np.random.seed(a.object_id)
    # Example: 5-dim random vector
    a.embedding = np.random.rand(1, 5)

# -----------------------------------------------------
# 3. Similarity functions
# -----------------------------------------------------

def similarity_artist(a, b):
    if a.maker and b.maker:
        return 1.0 if a.maker.name == b.maker.name else 0.0
    return 0.0

def similarity_style(a, b):
    return 1.0 if a.classification and a.classification == b.classification else 0.0

def similarity_material(a, b):
    if a.medium and b.medium and a.medium == b.medium:
        freq = material_freq[a.medium]
        return 1 / freq
    return 0.0

def similarity_period(a, b):
    # Simplify: use first 4 digits of date if numeric
    try:
        date_a = int(a.date[:4])
        date_b = int(b.date[:4])
        diff = abs(date_a - date_b)
        return max(0, 1 - diff / 100)
    except:
        return 0.0

def similarity_text(a, b):
    return float(cosine_similarity(a.embedding, b.embedding))

def similarity_culture(a, b):
    if a.maker and b.maker:
        return 1.0 if a.maker.culture == b.maker.culture else 0.0
    return 0.0

# -----------------------------------------------------
# 4. Combined similarity and dominant relationship
# -----------------------------------------------------

WEIGHTS = {
    "artist": 0.4,
    "style": 0.2,
    "material": 0.1,
    "period": 0.1,
    "text": 0.15,
    "culture": 0.05,
}

def combined_similarity(a, b):
    contributions = {
        "Artist": WEIGHTS["artist"] * similarity_artist(a, b),
        "Style": WEIGHTS["style"] * similarity_style(a, b),
        "Material": WEIGHTS["material"] * similarity_material(a, b),
        "Period": WEIGHTS["period"] * similarity_period(a, b),
        "Text": WEIGHTS["text"] * similarity_text(a, b),
        "Culture": WEIGHTS["culture"] * similarity_culture(a, b),
    }
    total_score = sum(contributions.values())
    dominant_relation = max(contributions, key=contributions.get)
    return total_score, dominant_relation

# -----------------------------------------------------
# 5. Build NetworkX graph
# -----------------------------------------------------

G = nx.Graph()

# Add nodes
for a in artworks:
    G.add_node(
        a.object_id,
        title=a.title,
        maker=a.maker.name if a.maker else None,
        classification=a.classification,
        medium=a.medium,
        image_url=a.image_url,
    )

# Add edges with weight and dominant relation
for i, a in enumerate(artworks):
    for b in artworks[i+1:]:
        score, relation = combined_similarity(a, b)
        if score > 0.6:
            G.add_edge(a.object_id, b.object_id, weight=score, relation=relation)

# -----------------------------------------------------
# 6. Prune edges to keep top connections per node
# -----------------------------------------------------

MAX_EDGES_PER_NODE = 5
for node in list(G.nodes):
    neighbors = list(G[node].items())
    neighbors.sort(key=lambda x: x[1]["weight"], reverse=True)
    for extra in neighbors[MAX_EDGES_PER_NODE:]:
        G.remove_edge(node, extra[0])

# -----------------------------------------------------
# 7. Shortest path example
# -----------------------------------------------------

def find_path(start_id, end_id):
    try:
        path = nx.shortest_path(G, source=start_id, target=end_id, weight=lambda u,v,d: 1/d["weight"])
        return path
    except nx.NetworkXNoPath:
        return None

# Example: pick two object IDs
example_ids = [artworks[0].object_id, artworks[-1].object_id]
path = find_path(example_ids[0], example_ids[1])
print(f"Shortest path from {example_ids[0]} → {example_ids[1]}:", path)

# -----------------------------------------------------
# 8. Export graph for frontend visualization
# -----------------------------------------------------

export = {
    "nodes": [
        {"id": n, "label": G.nodes[n]["title"], "maker": G.nodes[n]["maker"], "image_url": G.nodes[n]["image_url"]}
        for n in G.nodes
    ],
    "edges": [
        {"source": u, "target": v, "weight": d["weight"], "relation": d["relation"]}
        for u, v, d in G.edges(data=True)
    ]
}

with open("art_graph.json", "w") as f:
    json.dump(export, f, indent=2)

print(f"\nGraph exported to art_graph.json with {len(G.nodes)} nodes and {len(G.edges)} edges.")
