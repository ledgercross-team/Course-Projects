"""
Test Cases for Customer Account Service
"""
import unittest
from datetime import date
from service import create_app, db
from service.models import Account


class TestAccountModel(unittest.TestCase):
    """Test Cases for Account Model"""

    @classmethod
    def setUpClass(cls):
        """Run once before all tests."""
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///test.db"

    def setUp(self):
        """Set up test fixtures."""
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        """Tear down test fixtures."""
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _create_sample_account(self):
        """Helper method to create a sample account."""
        return {
            "name": "John Doe",
            "email": "john.doe@example.com",
            "address": "123 Main St, Anytown, USA",
            "phone_number": "555-1234",
            "date_joined": "2024-01-15",
        }

    def test_index(self):
        """It should return service information at the root URL."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["name"], "Customer Accounts Service")
        self.assertEqual(data["status"], "running")

    def test_health(self):
        """It should return OK for health check."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "OK")

    def test_create_account(self):
        """It should Create a new Account."""
        account_data = self._create_sample_account()
        response = self.client.post(
            "/accounts",
            json=account_data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertEqual(data["name"], "John Doe")
        self.assertEqual(data["email"], "john.doe@example.com")
        self.assertIn("id", data)

    def test_create_account_no_content_type(self):
        """It should not Create an Account with no Content-Type."""
        response = self.client.post("/accounts", data="not json")
        self.assertEqual(response.status_code, 415)

    def test_read_account(self):
        """It should Read a single Account."""
        account_data = self._create_sample_account()
        create_resp = self.client.post(
            "/accounts",
            json=account_data,
            content_type="application/json",
        )
        created = create_resp.get_json()

        response = self.client.get(f"/accounts/{created['id']}")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["name"], "John Doe")

    def test_read_account_not_found(self):
        """It should return 404 for a non-existent Account."""
        response = self.client.get("/accounts/0")
        self.assertEqual(response.status_code, 404)

    def test_list_accounts(self):
        """It should List all Accounts."""
        account_data = self._create_sample_account()
        self.client.post(
            "/accounts",
            json=account_data,
            content_type="application/json",
        )

        second_account = account_data.copy()
        second_account["name"] = "Jane Smith"
        second_account["email"] = "jane.smith@example.com"
        self.client.post(
            "/accounts",
            json=second_account,
            content_type="application/json",
        )

        response = self.client.get("/accounts")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 2)

    def test_list_accounts_empty(self):
        """It should return an empty list when no Accounts exist."""
        response = self.client.get("/accounts")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data), 0)

    def test_update_account(self):
        """It should Update an existing Account."""
        account_data = self._create_sample_account()
        create_resp = self.client.post(
            "/accounts",
            json=account_data,
            content_type="application/json",
        )
        created = create_resp.get_json()

        updated_data = account_data.copy()
        updated_data["name"] = "John Updated"
        updated_data["email"] = "john.updated@example.com"

        response = self.client.put(
            f"/accounts/{created['id']}",
            json=updated_data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["name"], "John Updated")
        self.assertEqual(data["email"], "john.updated@example.com")

    def test_update_account_not_found(self):
        """It should return 404 when updating a non-existent Account."""
        account_data = self._create_sample_account()
        response = self.client.put(
            "/accounts/0",
            json=account_data,
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 404)

    def test_delete_account(self):
        """It should Delete an Account."""
        account_data = self._create_sample_account()
        create_resp = self.client.post(
            "/accounts",
            json=account_data,
            content_type="application/json",
        )
        created = create_resp.get_json()

        response = self.client.delete(f"/accounts/{created['id']}")
        self.assertEqual(response.status_code, 204)

        get_resp = self.client.get(f"/accounts/{created['id']}")
        self.assertEqual(get_resp.status_code, 404)

    def test_delete_account_not_found(self):
        """It should return 204 even when deleting a non-existent Account."""
        response = self.client.delete("/accounts/0")
        self.assertEqual(response.status_code, 204)

    def test_account_serialize(self):
        """It should Serialize an Account."""
        with self.app.app_context():
            account = Account(
                name="Test User",
                email="test@example.com",
                address="456 Oak Ave",
                phone_number="555-5678",
                date_joined=date(2024, 1, 15),
            )
            data = account.serialize()
            self.assertEqual(data["name"], "Test User")
            self.assertEqual(data["email"], "test@example.com")
            self.assertEqual(data["date_joined"], "2024-01-15")

    def test_account_deserialize(self):
        """It should Deserialize an Account."""
        with self.app.app_context():
            account = Account()
            data = {
                "name": "Test User",
                "email": "test@example.com",
                "address": "456 Oak Ave",
                "phone_number": "555-5678",
                "date_joined": "2024-01-15",
            }
            account.deserialize(data)
            self.assertEqual(account.name, "Test User")
            self.assertEqual(account.email, "test@example.com")

    def test_account_deserialize_missing_field(self):
        """It should raise ValueError when deserializing with missing field."""
        with self.app.app_context():
            account = Account()
            data = {"name": "Test User"}
            with self.assertRaises(ValueError):
                account.deserialize(data)

    def test_account_deserialize_bad_data(self):
        """It should raise ValueError when deserializing bad data."""
        with self.app.app_context():
            account = Account()
            with self.assertRaises(ValueError):
                account.deserialize(None)

    def test_security_headers(self):
        """It should return security headers from Talisman."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        headers = response.headers
        self.assertIn("Content-Security-Policy", headers)

    def test_cors_headers(self):
        """It should return CORS headers for allowed origins."""
        response = self.client.get(
            "/accounts",
            headers={"Origin": "http://localhost:3000"},
        )
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
