from django.urls import path

from .views import (
    BloodBankListAPIView,
    NearbyBloodBankAPIView
)

urlpatterns = [

    path(
        '',
        BloodBankListAPIView.as_view()
    ),

    path(
        'nearby/',
        NearbyBloodBankAPIView.as_view()
    ),
]