import json
import random
from pathlib import Path
from django.core.management.base import BaseCommand
from six_degrees.models import ArtObject

class Command(BaseCommand):
    help = "Import up to 1000 ArtObject JSON files from data/objects/"

    def handle(self, *args, **options):
        data_dir = Path(__file__).resolve().parents[3] / "data" / "objects"
        all_files = list(data_dir.glob("*.json"))
        if not all_files:
            self.stdout.write(self.style.ERROR("❌ No object JSON files found"))
            return

        sample_files = random.sample(all_files, min(1000, len(all_files)))
        imported_count = 0

        for file_path in sample_files:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    record = json.load(f)

                # Get maker name as string if available
                maker_name = ""
                if record.get("makers") and len(record["makers"]) > 0:
                    maker_info = record["makers"][0]  # just take first maker
                    maker_name = maker_info.get("displayname", "")

                # Get primary image - prioritize isprimary=1, fallback to first image
                primary_image = None
                if record.get("media") and len(record["media"]) > 0:
                    # First, try to find primary image
                    for media_item in record["media"]:
                        if media_item.get("isprimary") == 1:
                            uri = media_item.get("uri")
                            # Validate URI is a valid HTTP/HTTPS URL
                            if uri and (uri.startswith("http://") or uri.startswith("https://")):
                                primary_image = uri
                                break
                    
                    # If no primary found, use first valid URI
                    if not primary_image:
                        for media_item in record["media"]:
                            uri = media_item.get("uri")
                            if uri and (uri.startswith("http://") or uri.startswith("https://")):
                                primary_image = uri
                                break
                
                # Skip this record if no valid image URI found
                if not primary_image:
                    self.stdout.write(self.style.WARNING(f"⚠️ Skipping {file_path.name}: No valid image URI found"))
                    continue

                # Convert IIIF URL to viewable image URL if needed
                image_url = primary_image
                # Check if it's a IIIF URL (contains /iiif/) and not already a full image URL
                if '/iiif/' in image_url and '/full/' not in image_url and not image_url.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                    # Convert IIIF info URL to image URL
                    image_url = image_url.rstrip('/')
                    image_url = f"{image_url}/full/800,/0/default.jpg"

                # Create or update ArtObject
                ArtObject.objects.update_or_create(
                    object_id=record.get("objectid"),
                    defaults={
                        "title": record.get("displaytitle", "Untitled"),
                        "maker": maker_name,  # ← store as string
                        "date": record.get("displaydate", ""),
                        "medium": record.get("medium", ""),
                        "department": record.get("department", ""),
                        "classification": (
                            record.get("classifications", [{}])[0].get("classification", "")
                            if record.get("classifications") else ""
                        ),
                        "image_url": image_url,  # Store converted URL
                    },
                )
                imported_count += 1

            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️ Error in {file_path.name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {imported_count} art objects successfully!"))
