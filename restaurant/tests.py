from django.test import TestCase
from restaurant.models import Booking, Menu


class BookingModelTest(TestCase):
    def setUp(self):
        self.booking = Booking.objects.create(
            first_name="John",
            reservation_date="2024-01-15",
            reservation_slot=10,
        )

    def test_booking_str(self):
        self.assertEqual(str(self.booking), "John")

    def test_booking_first_name(self):
        self.assertEqual(self.booking.first_name, "John")

    def test_booking_reservation_date(self):
        self.assertEqual(str(self.booking.reservation_date), "2024-01-15")

    def test_booking_reservation_slot(self):
        self.assertEqual(self.booking.reservation_slot, 10)


class MenuModelTest(TestCase):
    def setUp(self):
        self.menu_item = Menu.objects.create(
            name="Lemon Cake",
            price=15,
            menu_item_description="A delicious lemon-flavored cake",
        )

    def test_menu_str(self):
        self.assertEqual(str(self.menu_item), "Lemon Cake")

    def test_menu_name(self):
        self.assertEqual(self.menu_item.name, "Lemon Cake")

    def test_menu_price(self):
        self.assertEqual(self.menu_item.price, 15)

    def test_menu_item_description(self):
        self.assertEqual(
            self.menu_item.menu_item_description, "A delicious lemon-flavored cake"
        )
