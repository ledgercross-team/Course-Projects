from django.db import models


class BloodBank(models.Model):

    name = models.CharField(max_length=200)

    address = models.TextField()

    city = models.CharField(max_length=100)

    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7
    )

    phone = models.CharField(max_length=20)

    email = models.EmailField()

    verified = models.BooleanField(default=False)

    def __str__(self):
        return self.name