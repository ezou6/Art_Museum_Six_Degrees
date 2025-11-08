# tigerapp/urls.py
from django.urls import path
from .views import import_art_museum_objects

urlpatterns = [
    path('import_art/', import_art_museum_objects),
]
