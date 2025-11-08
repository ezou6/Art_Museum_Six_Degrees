from django.http import JsonResponse
from .utils.graph import generate_art_graph

def art_graph_view(request):
    """
    Returns the art graph JSON for frontend visualization
    """
    graph_data = generate_art_graph()  # optionally, cache this for performance
    return JsonResponse(graph_data)