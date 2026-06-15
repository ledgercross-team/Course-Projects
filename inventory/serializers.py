from rest_framework import serializers
from .models import BloodInventory


class BloodInventorySerializer(serializers.ModelSerializer):

    is_critical = serializers.SerializerMethodField()

    class Meta:
        model = BloodInventory
        fields = [
            "id",
            "blood_group",
            "units_available",
            "warning_threshold",
            "is_critical",
        ]

    def get_is_critical(self, obj):
        return obj.units_available <= obj.warning_threshold