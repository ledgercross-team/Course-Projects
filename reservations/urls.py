from django.urls import path

from .views import (
    ReservationCreateAPIView,
    ReservationListAPIView
)

urlpatterns = [
    path(
        "",
        ReservationListAPIView.as_view()
    ),

    path(
        "create/",
        ReservationCreateAPIView.as_view()
    ),
]