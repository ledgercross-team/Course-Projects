from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path(
        'api/bloodbanks/',
        include('bloodbanks.urls')
    ),

    path(
        'api/inventory/',
        include('inventory.urls')
    ),

    path(
        'api/reservations/',
        include('reservations.urls')
    ),
]