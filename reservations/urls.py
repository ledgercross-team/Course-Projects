from django.urls import path
from .views import ReservationCreateAPIView

urlpatterns = [
    path(
        "create/",
        ReservationCreateAPIView.as_view()
    ),
]