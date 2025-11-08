# tigerapp/urls.py
from django.urls import path
from . import views
from .views import import_art_museum_objects, home

urlpatterns = [
    path('', home),
    path('import_art/', import_art_museum_objects),
    path("api/graph/", views.art_graph_view, name="art-graph"),
]
