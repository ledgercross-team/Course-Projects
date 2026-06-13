from django.db import models
from bloodbanks.models import BloodBank


class BloodInventory(models.Model):

    BLOOD_GROUPS = [
        ("A+", "A+"),
        ("A-", "A-"),
        ("B+", "B+"),
        ("B-", "B-"),
        ("AB+", "AB+"),
        ("AB-", "AB-"),
        ("O+", "O+"),
        ("O-", "O-"),
    ]

    blood_bank = models.ForeignKey(
        BloodBank,
        on_delete=models.CASCADE
    )

    blood_group = models.CharField(
        max_length=5,
        choices=BLOOD_GROUPS
    )

    units_available = models.PositiveIntegerField()

    warning_threshold = models.PositiveIntegerField(
        default=10
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.blood_bank.name} - {self.blood_group}"