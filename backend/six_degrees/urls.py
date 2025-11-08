from django.urls import path
from .views import (
    import_art_museum_objects,
    art_graph_view,
    list_artworks,
    get_artwork,
    home
)

urlpatterns = [
    path('', home),
    path('art_graph/', art_graph_view, name='art_graph'),
    path('artworks/', list_artworks, name='list_artworks'),
    path('artworks/<int:artwork_id>/', get_artwork, name='get_artwork'),
    path('import_art/', import_art_museum_objects, name='import_art'),
]
