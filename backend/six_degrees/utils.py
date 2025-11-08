import networkx as nx
from collections import Counter
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import json
from .models import ArtObject, Maker

WEIGHTS = {
    "artist": 0.4,
    "style": 0.2,
    "material": 0.1,
    "period": 0.1,
    "text": 0.15,
    "culture": 0.05,
}

MAX_EDGES_PER_NODE = 5

# -------------------------
# Helper similarity functions
# -------------------------

def similarity_artist(a, b):
    if a.maker and b.maker:
        return 1.0 if a.maker.name == b.maker.name else 0.0
    return 0.0

def similarity_style(a, b):
    return 1.0 if a.classification and a.classification == b.classification else 0.0

def similarity_material(a, b, material_freq):
    if a.medium and b.medium and a.medium == b.medium:
        freq = material_freq[a.medium]
        return 1 / freq
    return 0.0

def similarity_period(a, b):
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

def compute_combined_similarity(a, b, material_freq):
    contributions = {
        "Artist": WEIGHTS["artist"] * similarity_artist(a, b),
        "Style": WEIGHTS["style"] * similarity_style(a, b),
        "Material": WEIGHTS["material"] * similarity_material(a, b, material_freq),
        "Period": WEIGHTS["period"] * similarity_period(a, b),
        "Text": WEIGHTS["text"] * similarity_text(a, b),
        "Culture": WEIGHTS["culture"] * similarity_culture(a, b),
    }
    total_score = sum(contributions.values())
    dominant_relation = max(contributions, key=contributions.get)
    return total_score, dominant_relation

# -------------------------
# Main function
# -------------------------

def generate_art_graph(export_path=None):
    # 1. Load artworks
    artworks = list(ArtObject.objects.select_related('maker').all())
    artworks = [a for a in artworks if a.title and a.maker]

    # 2. Preprocess embeddings & material frequencies
    material_freq = Counter(a.medium for a in artworks if a.medium)
    for a in artworks:
        np.random.seed(a.object_id)
        a.embedding = np.random.rand(1, 5)  # placeholder, replace with real embeddings

    # 3. Build graph
    G = nx.Graph()
    for a in artworks:
        G.add_node(
            a.object_id,
            title=a.title,
            maker=a.maker.name if a.maker else None,
            classification=a.classification,
            medium=a.medium,
            image_url=a.image_url,
        )

    for i, a in enumerate(artworks):
        for b in artworks[i+1:]:
            score, relation = compute_combined_similarity(a, b, material_freq)
            if score > 0.6:
                G.add_edge(a.object_id, b.object_id, weight=score, relation=relation)

    # 4. Prune edges
    for node in list(G.nodes):
        neighbors = list(G[node].items())
        neighbors.sort(key=lambda x: x[1]["weight"], reverse=True)
        for extra in neighbors[MAX_EDGES_PER_NODE:]:
            G.remove_edge(node, extra[0])

    # 5. Export JSON
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

    if export_path:
        with open(export_path, "w") as f:
            json.dump(export, f, indent=2)

    return export