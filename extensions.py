"""Shared Flask extensions (avoids circular imports)."""

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
