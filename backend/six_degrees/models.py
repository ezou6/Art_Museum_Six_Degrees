from django.db import models

# Create your models here.
# tigerapp/models.py

from django.db import models

class Maker(models.Model):
    name = models.CharField(max_length=255)
    culture = models.CharField(max_length=255, blank=True, null=True)
    gender = models.CharField(max_length=50, blank=True, null=True)
    birth_year = models.CharField(max_length=10, blank=True, null=True)
    death_year = models.CharField(max_length=10, blank=True, null=True)

    def __str__(self):
        return self.name


class ArtObject(models.Model):
    object_id = models.IntegerField(unique=True)
    title = models.CharField(max_length=255)
    date = models.CharField(max_length=100, blank=True, null=True)
    medium = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    classification = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    maker = models.ForeignKey(Maker, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.title
