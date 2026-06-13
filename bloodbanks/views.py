from rest_framework import generics
from .models import BloodBank
from .serializers import BloodBankSerializer


class BloodBankListAPIView(generics.ListAPIView):

    queryset = BloodBank.objects.all()

    serializer_class = BloodBankSerializer