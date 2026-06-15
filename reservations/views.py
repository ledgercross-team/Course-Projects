from rest_framework.generics import (
    CreateAPIView,
    ListAPIView,
)

from rest_framework.permissions import (
    IsAuthenticated,
)

from .models import Reservation
from .serializers import ReservationSerializer


class ReservationListAPIView(
    ListAPIView
):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer


class ReservationCreateAPIView(
    CreateAPIView
):
    permission_classes = [
        IsAuthenticated
    ]

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer