"""
Customer Accounts Service

This microservice handles CRUD operations for customer accounts.
"""
import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_talisman import Talisman
from flask_cors import CORS

db = SQLAlchemy()
talisman = Talisman()


def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URI", "sqlite:///accounts.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "s3cr3t-k3y")

    db.init_app(app)

    talisman.init_app(app, force_https=False)

    CORS(app, resources={r"/accounts/*": {"origins": "*"}})

    from service.routes import accounts_bp
    app.register_blueprint(accounts_bp)

    with app.app_context():
        db.create_all()

    logging.basicConfig(level=logging.INFO)
    app.logger.info("Customer Accounts Service initialized")

    return app
