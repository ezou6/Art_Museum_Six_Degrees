# tigerapp/urls.py
from django.urls import path
from .views import import_art_museum_objects, home

urlpatterns = [
    path('', home),  # root of /api/six_degrees/
    path('import_art/', import_art_museum_objects),
]
                                                                                        