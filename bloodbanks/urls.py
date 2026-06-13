from django.urls import path
from .views import BloodBankListAPIView

urlpatterns = [
    path(
        '',
        BloodBankListAPIView.as_view()
    )
]