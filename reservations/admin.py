from django.contrib import admin
from .models import Reservation
from inventory.models import BloodInventory


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):

    list_display = (
        "patient_name",
        "blood_group",
        "quantity",
        "status",
        "blood_bank",
    )

    list_filter = (
        "status",
        "blood_group",
    )

    def save_model(
        self,
        request,
        obj,
        form,
        change
    ):

        if change:

            old_obj = Reservation.objects.get(
                pk=obj.pk
            )

            if (
                old_obj.status != "approved"
                and
                obj.status == "approved"
            ):

                try:

                    inventory = (
                        BloodInventory.objects.get(
                            blood_bank=obj.blood_bank,
                            blood_group=obj.blood_group
                        )
                    )

                    if (
                        inventory.units_available
                        >= obj.quantity
                    ):

                        inventory.units_available -= (
                            obj.quantity
                        )

                        inventory.save()

                    else:
                        raise ValueError(
                            "Not enough blood units available."
                        )

                except BloodInventory.DoesNotExist:
                    raise ValueError(
                        "Inventory record not found."
                    )

        super().save_model(
            request,
            obj,
            form,
            change
        )