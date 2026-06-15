from rest_framework import serializers
from .models import BloodBank
from inventory.models import BloodInventory


class InventorySerializer(serializers.ModelSerializer):

    is_critical = serializers.SerializerMethodField()

    class Meta:
        model = BloodInventory
        fields = [
            "blood_group",
            "units_available",
            "is_critical",
        ]

    def get_is_critical(self, obj):
        return obj.units_available <= obj.warning_threshold


class BloodBankSerializer(serializers.ModelSerializer):

    inventory = serializers.SerializerMethodField()

    class Meta:
        model = BloodBank
        fields = "__all__"

    def get_inventory(self, obj):

        inventory = BloodInventory.objects.filter(
            blood_bank=obj
        )

        return InventorySerializer(
            inventory,
            many=True
        ).data