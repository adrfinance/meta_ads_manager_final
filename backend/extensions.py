from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_jwt_extended import JWTManager

# Initialize the extensions here
db = SQLAlchemy()
login_manager = LoginManager()
jwt = JWTManager()
