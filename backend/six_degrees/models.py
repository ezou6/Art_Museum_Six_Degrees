from django.db import models

class ArtObject(models.Model):
    object_id = models.IntegerField(unique=True, default=0)
    title = models.CharField(max_length=255)
    maker = models.CharField(max_length=255, blank=True, null=True)  # ← just a text field now
    date = models.CharField(max_length=100, blank=True, null=True)
    medium = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    classification = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return self.title
