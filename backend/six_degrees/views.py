from django.shortcuts import render
from django.http import JsonResponse
from .utils.graph import generate_art_graph

def art_graph_view(request):
    """
    Returns the cached (or newly generated) art graph JSON for frontend visualization
    """
    graph_data = generate_art_graph()
    return JsonResponse(graph_data)