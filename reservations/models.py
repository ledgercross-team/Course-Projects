from django.db import models
from django.conf import settings
from bloodbanks.models import BloodBank


class Reservation(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    patient_name = models.CharField(
        max_length=100
    )

    phone = models.CharField(
        max_length=20
    )

    blood_group = models.CharField(
        max_length=5
    )

    quantity = models.PositiveIntegerField()

    status = models.CharField(
        max_length=20,
        default="pending"
    )

    blood_bank = models.ForeignKey(
        BloodBank,
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.patient_name