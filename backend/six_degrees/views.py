from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import JsonResponse
from .req_lib import getJSON
from .models import ArtObject
from .utils import generate_art_graph


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


def list_artworks(request):
    """List all artworks."""
    artworks = ArtObject.objects.select_related('maker').all()
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
            'maker': artwork.maker.displayname if artwork.maker else None,
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
        artwork = ArtObject.objects.select_related('maker').get(object_id=artwork_id)
        return JsonResponse({
            'id': artwork.object_id,
            'object_id': artwork.object_id,
            'title': artwork.title,
            'date': artwork.date,
            'medium': artwork.medium,
            'department': artwork.department,
            'classification': artwork.classification,
            'image_url': artwork.image_url,
            'maker': artwork.maker.displayname if artwork.maker else None,
        })
    except ArtObject.DoesNotExist:
        return JsonResponse({
            'error': 'Artwork not found'
        }, status=404)


def home(request):
    """Home/root endpoint."""
    return JsonResponse({
        "message": "Princeton University Art Museum - Six Degrees API",
        "endpoints": {
            "art_graph": "/api/six_degrees/art_graph/",
            "list_artworks": "/api/six_degrees/artworks/",
            "get_artwork": "/api/six_degrees/artworks/<id>/",
            "import_art": "/api/six_degrees/import_art/",
        }
    })
