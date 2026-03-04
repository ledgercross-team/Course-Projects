"""
Test Suite Initialization

This module sets up the testing environment for the Customer Accounts service.
"""
import unittest
from service import create_app, db


class BaseTestCase(unittest.TestCase):
    """Base class for all unit tests."""

    @classmethod
    def setUpClass(cls):
        """Run once before all tests."""
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.app.config["DEBUG"] = False
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        cls.app.app_context().push()

    @classmethod
    def tearDownClass(cls):
        """Run once after all tests."""
        db.session.close()

    def setUp(self):
        """Runs before each test."""
        self.client = self.app.test_client()
        db.drop_all()  # Ensure a clean slate
        db.create_all()

    def tearDown(self):
        """Runs after each test."""
        db.session.remove()
        db.drop_all()
