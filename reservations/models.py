from django.db import models
from bloodbanks.models import BloodBank

class Reservation(models.Model):
    blood_bank = models.ForeignKey(
        BloodBank,
        on_delete=models.CASCADE
    )

    patient_name = models.CharField(max_length=100)

    blood_group = models.CharField(max_length=5)

    quantity = models.PositiveIntegerField()

    phone = models.CharField(max_length=20)

    status = models.CharField(
        max_length=20,
        default="pending"
    )

    def __str__(self):
        return self.patient_name