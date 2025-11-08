from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .req_lib import getJSON  # from TigerApps
from .models import ArtObject, Maker

@api_view(['GET'])
def import_art_museum_objects(request):
    # Example endpoint: fetch objects from Princeton Art Museum API
    endpoint = "https://api.princeton.edu:443/artmuseum/objects/"
    params = {"rows": 10}  # adjust number of objects as needed

    data = getJSON(endpoint, **params)  # handles OAuth3 + token

    for record in data.get('records', []):
        maker_data = record.get('maker')
        maker_obj = None

        if maker_data:
            # Use makerid as unique identifier
            maker_obj, _ = Maker.objects.update_or_create(
                makerid=maker_data.get('makerid'),
                defaults={
                    'displayname': maker_data.get('displayname', 'Unknown'),
                    'begindate': maker_data.get('begindate'),
                    'enddate': maker_data.get('enddate'),
                    'culturegroup': maker_data.get('culturegroup'),
                    'makertype': maker_data.get('makertype'),
                    'biography': maker_data.get('biography'),
                }
            )

        # Create or update ArtObject
        ArtObject.objects.update_or_create(
            object_id=record.get('id'),
            defaults={
                'title': record.get('title', 'Untitled'),
                'date': record.get('displaydate'),
                'medium': record.get('medium'),
                'department': record.get('department'),
                'classification': record.get('classification'),
                'image_url': record.get('primaryimageurl'),
                'maker': maker_obj
            }
        )

    return Response({"message": "Art Museum objects imported successfully!"})

def home(request):
    """
    Simple root view.
    """
    return JsonResponse({"message": "Welcome to the Six Degrees API!"})

