import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY')  # Secret for Flask sessions
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False    
    JWT_SECRET_KEY = os.getenv('JWT_    SECRET_KEY')  # Ensure this is secure
    JWT_TOKEN_LOCATION = 'headers'  # Default location for token
    META_ACCESS_TOKEN = os.getenv('META_ACCESS_TOKEN')
