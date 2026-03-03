from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from restaurant.models import Booking, Menu


class BookingAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.booking_data = {
            "first_name": "Jane",
            "reservation_date": "2024-06-15",
            "reservation_slot": 11,
        }
        self.booking = Booking.objects.create(
            first_name="John",
            reservation_date="2024-01-15",
            reservation_slot=10,
        )

    def test_get_all_bookings(self):
        response = self.client.get("/restaurant/booking/tables/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_booking(self):
        response = self.client.post(
            "/restaurant/booking/tables/", self.booking_data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_single_booking(self):
        response = self.client.get(
            f"/restaurant/booking/tables/{self.booking.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_booking(self):
        updated_data = {
            "first_name": "John Updated",
            "reservation_date": "2024-01-20",
            "reservation_slot": 12,
        }
        response = self.client.put(
            f"/restaurant/booking/tables/{self.booking.id}/",
            updated_data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_booking(self):
        response = self.client.delete(
            f"/restaurant/booking/tables/{self.booking.id}/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_unauthenticated_access(self):
        unauthenticated_client = APIClient()
        response = unauthenticated_client.get("/restaurant/booking/tables/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MenuAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", password="testpass123"
        )
        self.client.force_authenticate(user=self.user)

        self.menu_item = Menu.objects.create(
            name="Lemon Cake",
            price=15,
            menu_item_description="A delicious lemon-flavored cake",
        )

    def test_get_all_menu_items(self):
        response = self.client.get("/restaurant/menu/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_menu_item(self):
        data = {
            "name": "Greek Salad",
            "price": 12,
            "menu_item_description": "Fresh Greek Salad",
        }
        response = self.client.post("/restaurant/menu/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_get_single_menu_item(self):
        response = self.client.get(f"/restaurant/menu/{self.menu_item.id}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
