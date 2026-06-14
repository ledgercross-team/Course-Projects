from rest_framework import generics

from .models import BloodInventory
from .serializers import BloodInventorySerializer


class InventoryListAPIView(
    generics.ListAPIView
):

    serializer_class = BloodInventorySerializer

    def get_queryset(self):

        queryset = BloodInventory.objects.all()

        blood_group = self.request.GET.get(
            "blood_group"
        )

        if blood_group:

            queryset = queryset.filter(
                blood_group=blood_group
            )

        return queryset