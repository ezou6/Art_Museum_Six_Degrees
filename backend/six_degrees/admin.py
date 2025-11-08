from django.contrib import admin
from .models import ArtObject

@admin.register(ArtObject)
class ArtObjectAdmin(admin.ModelAdmin):
    list_display = ("object_id", "title", "department", "classification", "medium", "maker")
    search_fields = ("title", "department", "classification", "medium", "maker")

