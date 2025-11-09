import json
import random
from pathlib import Path
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from .req_lib import getJSON
from .models import ArtObject
from .utils import generate_art_graph


def convert_iiif_to_image_url(uri):
    """
    Convert IIIF Image API URL to a viewable image URL.
    IIIF URLs like: https://media.artmuseum.princeton.edu/iiif/3/collection/INV021857
    Need to be converted to: https://media.artmuseum.princeton.edu/iiif/3/collection/INV021857/full/800,/0/default.jpg
    """
    if not uri:
        return None
    
    # Check if it's already a full image URL (contains /full/ or ends with image extension)
    if '/full/' in uri or uri.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
        return uri
    
    # Check if it's a IIIF URL (contains /iiif/)
    if '/iiif/' in uri:
        # Convert IIIF info URL to image URL
        # Remove trailing slash if present
        uri = uri.rstrip('/')
        # Append IIIF image request parameters: /full/800,/0/default.jpg
        return f"{uri}/full/800,/0/default.jpg"
    
    return uri


# @api_view(['GET'])
def import_art_museum_objects(request):
    """Import artworks from Princeton Art Museum API."""
    endpoint = "https://data.artmuseum.princeton.edu/objects/"
    params = {"rows": 50}  # how many objects to fetch

    try:
        data = getJSON(endpoint, **params)
        
        imported_count = 0
        for record in data.get('records', []):
           
            # Get primary image URL
            primary_image = None
            if record.get('media') and len(record['media']) > 0:
                primary_image = record['media'][0].get('uri')

            ArtObject.objects.update_or_create(
                object_id=record.get('objectid'),
                defaults={
                    'title': record.get('displaytitle', 'Untitled'),
                    'date': record.get('displaydate', ''),
                    'medium': record.get('medium', ''),
                    'department': record.get('department', ''),
                    'classification': record.get('classifications', [{}])[0].get('classification', '') if record.get('classifications') else '',
                    'image_url': primary_image,
                    'maker': record.get('maker')
                }
            )
            imported_count += 1

        return Response({
            "message": f"Art Museum objects imported successfully! {imported_count} objects imported.",
            "count": imported_count
        })
    except Exception as e:
        return Response({
            "error": str(e)
        }, status=500)


def art_graph_view(request):
    """Returns the cached (or newly generated) art graph JSON for frontend visualization."""
    try:
        graph_data = generate_art_graph()
        return JsonResponse(graph_data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
def get_target_artwork_view(request, artwork_id):
    """Get a target artwork that is 4-9 steps away from the starting artwork (prefers 6 steps)."""
    try:
        from .utils import get_target_artwork
        target_data = get_target_artwork(artwork_id, preferred_steps=6, min_steps=4, max_steps=9)
        
        if not target_data:
            return JsonResponse({
                "error": "Could not find a target artwork 4-9 steps away"
            }, status=404)
        
        # Convert IIIF URL if needed
        image_url = target_data.get('image_url')
        if image_url:
            image_url = convert_iiif_to_image_url(image_url)
        
        return JsonResponse({
            'id': target_data.get('id') or target_data.get('object_id'),
            'object_id': target_data.get('id') or target_data.get('object_id'),
            'title': target_data.get('title') or target_data.get('label'),
            'maker': target_data.get('maker'),
            'date': target_data.get('date'),
            'medium': target_data.get('medium'),
            'department': target_data.get('department'),
            'classification': target_data.get('classification'),
            'image_url': image_url,
        })
    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)


@api_view(['GET'])
def get_path_distance_view(request, artwork_id, target_id):
    """Get the shortest path distance between two artworks."""
    try:
        import networkx as nx
        from .utils import generate_art_graph
        
        graph_data = generate_art_graph()
        G = nx.Graph()
        for node in graph_data["nodes"]:
            G.add_node(node["id"], **node)
        for edge in graph_data["edges"]:
            G.add_edge(edge["source"], edge["target"], **edge)
        
        try:
            distance = nx.shortest_path_length(G, source=artwork_id, target=target_id)
            return JsonResponse({
                'distance': distance,
                'has_path': True
            })
        except nx.NetworkXNoPath:
            return JsonResponse({
                'distance': None,
                'has_path': False
            })
    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)


def list_artworks(request):
    """List all artworks."""
    artworks = ArtObject.objects.all()
    artworks_data = [
        {
            'id': artwork.object_id,
            'object_id': artwork.object_id,
            'title': artwork.title,
            'date': artwork.date,
            'medium': artwork.medium,
            'department': artwork.department,
            'classification': artwork.classification,
            'image_url': artwork.image_url,
            'maker': artwork.maker if artwork.maker else None,
        }
        for artwork in artworks
    ]
    return JsonResponse({
        'artworks': artworks_data,
        'count': len(artworks_data)
    })


def get_artwork(request, artwork_id):
    """Get a single artwork by ID."""
    try:
        artwork = ArtObject.objects.get(object_id=artwork_id)
        return JsonResponse({
            'id': artwork.object_id,
            'object_id': artwork.object_id,
            'title': artwork.title,
            'date': artwork.date,
            'medium': artwork.medium,
            'department': artwork.department,
            'classification': artwork.classification,
            'image_url': artwork.image_url,
            'maker': artwork.maker if artwork.maker else None,
        })
    except ArtObject.DoesNotExist:
        return JsonResponse({
            'error': 'Artwork not found'
        }, status=404)


@api_view(['GET'])
def get_random_objects(request):
    """Sample 20 random objects from JSON files and return them."""
    try:
        # Get the data directory path
        # views.py is at backend/six_degrees/views.py, so parents[1] = backend/
        data_dir = Path(__file__).resolve().parents[1] / "data" / "objects"
        all_files = list(data_dir.glob("*.json"))
        
        if not all_files:
            return JsonResponse({
                "error": "No object JSON files found"
            }, status=404)
        
        # Sample 20 random files
        sample_size = min(20, len(all_files))
        sample_files = random.sample(all_files, sample_size)
        
        objects_data = []
        
        for file_path in sample_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    record = json.load(f)
                
                # Get maker name as string if available
                maker_name = ""
                if record.get("makers") and len(record["makers"]) > 0:
                    maker_info = record["makers"][0]
                    maker_name = maker_info.get("displayname", "")
                
                # Get primary image - prioritize isprimary=1, fallback to first image
                primary_image = None
                if record.get("media") and len(record["media"]) > 0:
                    # First, try to find primary image
                    for media_item in record["media"]:
                        if media_item.get("isprimary") == 1:
                            uri = media_item.get("uri")
                            # Validate URI is a valid HTTP/HTTPS URL
                            if uri and (uri.startswith("http://") or uri.startswith("https://")):
                                primary_image = uri
                                break
                    
                    # If no primary found, use first valid URI
                    if not primary_image:
                        for media_item in record["media"]:
                            uri = media_item.get("uri")
                            if uri and (uri.startswith("http://") or uri.startswith("https://")):
                                primary_image = uri
                                break
                
                # Skip this record if no valid image URI found
                if not primary_image:
                    continue
                
                # Convert IIIF URL to viewable image URL if needed
                image_url = convert_iiif_to_image_url(primary_image)
                
                # Create or update ArtObject in database
                art_object, created = ArtObject.objects.update_or_create(
                    object_id=record.get("objectid"),
                    defaults={
                        "title": record.get("displaytitle", "Untitled"),
                        "maker": maker_name,
                        "date": record.get("displaydate", ""),
                        "medium": record.get("medium", ""),
                        "department": record.get("department", ""),
                        "classification": (
                            record.get("classifications", [{}])[0].get("classification", "")
                            if record.get("classifications") else ""
                        ),
                        "image_url": image_url,  # Store converted URL
                    },
                )
                
                # Add to response data
                objects_data.append({
                    'id': art_object.object_id,
                    'object_id': art_object.object_id,
                    'title': art_object.title,
                    'date': art_object.date,
                    'medium': art_object.medium,
                    'department': art_object.department,
                    'classification': art_object.classification,
                    'image_url': art_object.image_url,
                    'maker': art_object.maker,
                })
                
            except Exception as e:
                # Log error but continue with other files
                continue
        
        # Clear graph cache so it regenerates with new artworks
        from django.core.cache import cache
        cache.delete("art_graph_json")
        
        return JsonResponse({
            'artworks': objects_data,
            'count': len(objects_data)
        })
        
    except Exception as e:
        return JsonResponse({
            "error": str(e)
        }, status=500)


def home(request):
    """Home/root endpoint."""
    return JsonResponse({
        "message": "Princeton University Art Museum - Six Degrees API",
        "endpoints": {
            "art_graph": "/api/six_degrees/art_graph/",
            "list_artworks": "/api/six_degrees/artworks/",
            "get_artwork": "/api/six_degrees/artworks/<id>/",
            "import_art": "/api/six_degrees/import_art/",
            "random_objects": "/api/six_degrees/random_objects/",
        }
    })
