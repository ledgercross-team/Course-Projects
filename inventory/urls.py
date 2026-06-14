from django.urls import path

from .views import InventoryListAPIView

urlpatterns = [

    path(
        '',
        InventoryListAPIView.as_view()
    )

]