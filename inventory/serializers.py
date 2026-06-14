from rest_framework import serializers
from .models import BloodInventory


class BloodInventorySerializer(
    serializers.ModelSerializer
):

    class Meta:
        model = BloodInventory
        fields = "__all__"