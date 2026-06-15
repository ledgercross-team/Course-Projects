from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import (
    CreateAPIView,
    ListAPIView
)

from .models import Reservation
from .serializers import ReservationSerializer


class ReservationCreateAPIView(
    CreateAPIView
):
    permission_classes = [
        IsAuthenticated
    ]

    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    def perform_create(
        self,
        serializer
    ):
        serializer.save(
            user=self.request.user
        )


class ReservationListAPIView(
    ListAPIView
):
    permission_classes = [
        IsAuthenticated
    ]

    serializer_class = ReservationSerializer

    def get_queryset(self):
        return Reservation.objects.filter(
            user=self.request.user
        ).order_by("-id")