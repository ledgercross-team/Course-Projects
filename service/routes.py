"""
Account Routes

This module implements all RESTful API routes for the Customer Accounts service.
Supports: CREATE, READ, UPDATE, DELETE, and LIST operations.
"""
from flask import Blueprint, request, jsonify, abort
from service.models import Account
from service import db

accounts_bp = Blueprint("accounts", __name__)


@accounts_bp.route("/")
def index():
    """Root URL returns service information."""
    return jsonify(
        name="Customer Accounts Service",
        version="1.0.0",
        status="running",
        paths={
            "list_accounts": "GET /accounts",
            "create_account": "POST /accounts",
            "read_account": "GET /accounts/<id>",
            "update_account": "PUT /accounts/<id>",
            "delete_account": "DELETE /accounts/<id>",
        },
    ), 200


@accounts_bp.route("/health")
def health():
    """Health check endpoint."""
    return jsonify(status="OK"), 200


@accounts_bp.route("/accounts", methods=["POST"])
def create_account():
    """Create a new customer account."""
    if not request.is_json:
        abort(415, description="Content-Type must be application/json")

    data = request.get_json()
    account = Account()
    account.deserialize(data)

    db.session.add(account)
    db.session.commit()

    return jsonify(account.serialize()), 201, {
        "Location": f"/accounts/{account.id}"
    }


@accounts_bp.route("/accounts/<int:account_id>", methods=["GET"])
def read_account(account_id):
    """Read a single customer account by ID."""
    account = Account.query.get(account_id)
    if not account:
        abort(404, description=f"Account with id [{account_id}] was not found.")

    return jsonify(account.serialize()), 200


@accounts_bp.route("/accounts", methods=["GET"])
def list_accounts():
    """List all customer accounts."""
    accounts = Account.query.all()
    results = [account.serialize() for account in accounts]
    return jsonify(results), 200


@accounts_bp.route("/accounts/<int:account_id>", methods=["PUT"])
def update_account(account_id):
    """Update an existing customer account."""
    account = Account.query.get(account_id)
    if not account:
        abort(404, description=f"Account with id [{account_id}] was not found.")

    if not request.is_json:
        abort(415, description="Content-Type must be application/json")

    data = request.get_json()
    account.deserialize(data)

    db.session.commit()

    return jsonify(account.serialize()), 200


@accounts_bp.route("/accounts/<int:account_id>", methods=["DELETE"])
def delete_account(account_id):
    """Delete a customer account."""
    account = Account.query.get(account_id)
    if account:
        db.session.delete(account)
        db.session.commit()

    return "", 204


@accounts_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify(status=404, error="Not Found", message=str(error)), 404


@accounts_bp.errorhandler(415)
def unsupported_media_type(error):
    """Handle 415 errors."""
    return jsonify(
        status=415,
        error="Unsupported Media Type",
        message=str(error),
    ), 415


@accounts_bp.errorhandler(400)
def bad_request(error):
    """Handle 400 errors."""
    return jsonify(status=400, error="Bad Request", message=str(error)), 400
