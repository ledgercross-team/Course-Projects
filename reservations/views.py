from rest_framework.generics import CreateAPIView
from .models import Reservation
from .serializers import ReservationSerializer

class ReservationCreateAPIView(
    CreateAPIView
):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer