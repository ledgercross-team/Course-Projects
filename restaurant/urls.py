from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tables', views.BookingViewSet)

urlpatterns = [
    # Template-based views
    path('', views.home, name="home"),
    path('about/', views.about, name="about"),
    path('book/', views.book, name="book"),
    path('menu/', views.menu, name="menu"),
    path('menu_item/<int:pk>/', views.display_menu_item, name="menu_item"),
    path('bookings/', views.bookings, name="bookings"),

    # DRF API endpoints
    path('api/bookings/', views.bookings_api, name="bookings_api"),
    path('restaurant/booking/', include(router.urls)),
    path('restaurant/menu/', views.MenuItemsView.as_view(), name="menu-items"),
    path('restaurant/menu/<int:pk>', views.SingleMenuItemView.as_view(), name="single-menu-item"),
]