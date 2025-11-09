# six_degrees/urls.py
from django.urls import path
from .views import (
    import_art_museum_objects,
    art_graph_view,
    list_artworks,
    get_artwork,
    home,
    get_random_objects,
    get_target_artwork_view,
    get_path_distance_view,
    clear_artworks,
    cas_login,
    cas_logout,
    check_auth
)

urlpatterns = [
    path('', home),
    path('art_graph/', art_graph_view, name='art_graph'),
    path('artworks/', list_artworks, name='list_artworks'),
    path('artworks/<int:artwork_id>/', get_artwork, name='get_artwork'),
    path('artworks/<int:artwork_id>/target/', get_target_artwork_view, name='get_target_artwork'),
    path('artworks/<int:artwork_id>/distance/<int:target_id>/', get_path_distance_view, name='get_path_distance'),
    path('import_art/', import_art_museum_objects, name='import_art'),
    path('random_objects/', get_random_objects, name='random_objects'),
    path('clear_artworks/', clear_artworks, name='clear_artworks'),
    path('login/', cas_login, name='cas_login'),
    path('logout/', cas_logout, name='cas_logout'),
    path('check_auth/', check_auth, name='check_auth'),
]
