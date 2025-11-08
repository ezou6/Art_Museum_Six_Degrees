from django.shortcuts import render
<<<<<<< HEAD
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .req_lib import make_api_request  # from TigerApps
from .models import ArtObject, Maker

@api_view(['GET'])
def import_art_museum_objects(request):
    # Example endpoint: /artmuseum/objects/
    endpoint = "https://api.princeton.edu:443/artmuseum/objects/"
    params = {"rows": 10}  # how many objects to fetch

    data = make_api_request(endpoint, params)  # ReqLib handles OAuth3 + token
    
    for record in data.get('records', []):
        maker_data = record.get('maker')
        maker_obj = None
        if maker_data:
            maker_obj, _ = Maker.objects.get_or_create(
                name=maker_data.get('displayname', 'Unknown'),
                defaults={
                    'culture': maker_data.get('culture'),
                    'gender': maker_data.get('gender'),
                    'birth_year': maker_data.get('beginyear'),
                    'death_year': maker_data.get('endyear'),
                }
            )

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
=======
from django.http import JsonResponse
from .utils.graph import generate_art_graph

def art_graph_view(request):
    """
    Returns the cached (or newly generated) art graph JSON for frontend visualization
    """
    graph_data = generate_art_graph()
    return JsonResponse(graph_data)
>>>>>>> 9d31908972f9b4cc156b13878ef64a266dbeb6e9
