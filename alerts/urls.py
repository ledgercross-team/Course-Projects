from django.urls import path
from .views import CriticalAlertAPIView

urlpatterns = [
    path(
        "",
        CriticalAlertAPIView.as_view()
    ),
]