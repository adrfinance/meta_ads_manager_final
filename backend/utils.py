import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
from backend.models import User
from backend.config import Config

# JWT Token Authentication Decorator
def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 403

        try:
            # Decode the JWT token using the secret key
            decoded_token = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=['HS256'])
            user = User.query.filter_by(id=decoded_token['sub']).first()
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token expired!'}), 403
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token!'}), 403

        return f(user, *args, **kwargs)

    return decorated_function
