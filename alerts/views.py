from rest_framework.views import APIView
from rest_framework.response import Response

from inventory.models import BloodInventory


class CriticalAlertAPIView(
    APIView
):

    def get(self, request):

        critical_items = (
            BloodInventory.objects.filter(
                units_available__lte=10
            )
        )

        data = []

        for item in critical_items:

            data.append({
                "blood_bank":
                item.blood_bank.name,

                "blood_group":
                item.blood_group,

                "units":
                item.units_available,
            })

        return Response(data)