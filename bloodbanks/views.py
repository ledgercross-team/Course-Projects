from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from geopy.distance import geodesic
from rest_framework.permissions import AllowAny
from .models import BloodBank
from .serializers import BloodBankSerializer


class BloodBankListAPIView(generics.ListAPIView):

    queryset = BloodBank.objects.all()
    serializer_class = BloodBankSerializer


class NearbyBloodBankAPIView(APIView):

    def get(self, request):

        lat = request.GET.get("lat")
        lng = request.GET.get("lng")

        if not lat or not lng:
            return Response({
                "error": "latitude and longitude required"
            })

        user_location = (
            float(lat),
            float(lng)
        )

        nearby_banks = []

        for bank in BloodBank.objects.all():

            bank_location = (
                float(bank.latitude),
                float(bank.longitude)
            )

            distance = geodesic(
                user_location,
                bank_location
            ).km

            if distance <= 10:

                nearby_banks.append({
                    "id": bank.id,
                    "name": bank.name,
                    "city": bank.city,
                    "distance": round(distance, 2)
                })

        return Response(nearby_banks)