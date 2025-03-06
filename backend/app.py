from flask import Flask
from flask_migrate import Migrate
from flask_cors import CORS
import os
from dotenv import load_dotenv
import logging
from backend.extensions import db, login_manager, jwt  # Import from extensions.py
from backend.models import User  # Import the User model
from datetime import timedelta


from flask_login import current_user

@login_manager.user_loader
def load_user(user_id):
    # Check if the user is anonymous
    if user_id is None or current_user.is_anonymous:
        return None  # Return None for anonymous users

    return User.query.get(int(user_id))  # Return the user by ID if logged in


logging.basicConfig(level=logging.DEBUG)

def create_app():
    # Initialize Flask app
    app = Flask(__name__)

    # Load environment variables from .env file
    load_dotenv()

    # Configure the app directly in app.py (database URI, etc.)
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.path.abspath(os.path.dirname(__file__)), "instance", "meta_ads_manager.db")}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['META_ACCESS_TOKEN'] = os.getenv('META_ACCESS_TOKEN')
    app.config["JWT_VERIFY_SUB"] = False
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=1)
    token_location_value = os.getenv('JWT_TOKEN_LOCATION', 'headers')  # Default to 'headers' if not set
    app.config['JWT_TOKEN_LOCATION'] = [token_location_value] if isinstance(token_location_value, str) else token_location_value


    # Initialize the extensions with the app object
    db.init_app(app)
    migrate = Migrate(app, db)  # Database migration support
    login_manager.init_app(app)
    jwt.init_app(app)

    # Enable CORS for the frontend
    CORS(app, supports_credentials=True)

    # Register blueprints (routes)
    from backend.routes import routes_bp
    app.register_blueprint(routes_bp)

    # Set up the user loader for Flask-Login
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))  # This loads the user by ID

    return app

# Ensure app runs when executed directly
if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)
