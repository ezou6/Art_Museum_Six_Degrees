from django.db import models

# Create your models here.
# tigerapp/models.py

from django.db import models

class Maker(models.Model):
    makerid = models.IntegerField(unique=True)
    displayname = models.CharField(max_length=255)
    begindate = models.IntegerField(blank=True, null=True)
    enddate = models.IntegerField(blank=True, null=True)
    culturegroup = models.CharField(max_length=255, blank=True, null=True)
    makertype = models.CharField(max_length=50, blank=True, null=True)
    biography = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.displayname

class ArtObject(models.Model):
    object_id = models.IntegerField(unique=True, default=0)
    title = models.CharField(max_length=255)
    date = models.CharField(max_length=100, blank=True, null=True)
    medium = models.CharField(max_length=255, blank=True, null=True)
    department = models.CharField(max_length=255, blank=True, null=True)
    classification = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    maker = models.ForeignKey(Maker, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return self.title
