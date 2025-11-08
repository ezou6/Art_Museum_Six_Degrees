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

                # Get primary image
                primary_image = None
                if record.get("media") and len(record["media"]) > 0:
                    primary_image = record["media"][0].get("uri")

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
                        "image_url": primary_image,
                    },
                )
                imported_count += 1

            except Exception as e:
                self.stdout.write(self.style.WARNING(f"⚠️ Error in {file_path.name}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {imported_count} art objects successfully!"))
