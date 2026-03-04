"""
Account Model

This module defines the Account data model for the Customer Accounts service.
"""
from service import db


class Account(db.Model):
    """Represents a customer account."""

    __tablename__ = "accounts"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(128), nullable=False)
    address = db.Column(db.String(256), nullable=False)
    phone_number = db.Column(db.String(32), nullable=False)
    date_joined = db.Column(db.Date, nullable=False)

    def serialize(self):
        """Serialize the Account object into a dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "address": self.address,
            "phone_number": self.phone_number,
            "date_joined": self.date_joined.isoformat(),
        }

    def deserialize(self, data):
        """Deserialize a dictionary into an Account object."""
        try:
            self.name = data["name"]
            self.email = data["email"]
            self.address = data["address"]
            self.phone_number = data["phone_number"]
            if isinstance(data["date_joined"], str):
                from datetime import date
                self.date_joined = date.fromisoformat(data["date_joined"])
            else:
                self.date_joined = data["date_joined"]
        except KeyError as error:
            raise ValueError(
                f"Invalid Account: missing {error.args[0]}"
            ) from error
        except TypeError as error:
            raise ValueError(
                f"Invalid Account: body contained bad or no data - {error}"
            ) from error
        return self
