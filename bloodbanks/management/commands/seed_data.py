from django.core.management.base import BaseCommand
from bloodbanks.models import BloodBank
from inventory.models import BloodInventory


class Command(BaseCommand):

    help = "Create demo blood bank data"

    def handle(self, *args, **kwargs):

        blood_groups = [
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
        ]

        banks = [
            {
                "name": "Dhaka Blood Center",
                "city": "Dhaka",
                "lat": 23.8103,
                "lng": 90.4125,
            },
            {
                "name": "Red Crescent Blood Bank",
                "city": "Dhaka",
                "lat": 23.7465,
                "lng": 90.3760,
            },
            {
                "name": "Square Hospital Blood Bank",
                "city": "Dhaka",
                "lat": 23.7510,
                "lng": 90.3940,
            },
            {
                "name": "Chittagong Blood Center",
                "city": "Chattogram",
                "lat": 22.3569,
                "lng": 91.7832,
            },
            {
                "name": "Rajshahi Blood Bank",
                "city": "Rajshahi",
                "lat": 24.3745,
                "lng": 88.6042,
            }
        ]

        for bank_data in banks:

            bank, created = BloodBank.objects.get_or_create(
                name=bank_data["name"],
                defaults={
                    "address": bank_data["city"],
                    "city": bank_data["city"],
                    "latitude": bank_data["lat"],
                    "longitude": bank_data["lng"],
                    "phone": "01700000000",
                    "email": f"{bank_data['name'].replace(' ', '').lower()}@demo.com",
                    "verified": True
                }
            )

            for group in blood_groups:

                BloodInventory.objects.get_or_create(
                    blood_bank=bank,
                    blood_group=group,
                    defaults={
                        "units_available": 20,
                        "warning_threshold": 10
                    }
                )

        self.stdout.write(
            self.style.SUCCESS(
                "Demo data created successfully!"
            )
        )