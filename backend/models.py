from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from backend.extensions import db, login_manager  # Import from extensions.py
import uuid  # For generating unique meta_campaign_id

# ==========================
# User Model
# ==========================
class User(UserMixin, db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    _password = db.Column(db.String(128), nullable=False)

    # Define relationships to fix missing properties
    campaigns = db.relationship('Campaign', back_populates='user', lazy=True)
    ad_groups = db.relationship('AdGroup', back_populates='user', lazy=True)
    ads = db.relationship('Ad', back_populates='user', lazy=True)
    ad_creatives = db.relationship('AdCreative', back_populates='user', lazy=True)

    @property
    def password(self):
        return self._password

    @password.setter
    def password(self, password):
        self._password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self._password, password)

    def is_active(self):
        return True  # Assume active if no suspension logic

    def is_anonymous(self):
        return False  # Users are not anonymous when logged in

    def get_id(self):
        return str(self.id)  # Flask-Login uses this for session management


# ==========================
# Campaign Model
# ==========================
class Campaign(db.Model):
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    objective = db.Column(db.String(50), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    special_ad_categories = db.Column(db.String(50), nullable=True, default="NONE")
    meta_campaign_id = db.Column(db.String(50), nullable=False, unique=True)

    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Corrected relationship (match with `User`)
    user = db.relationship('User', back_populates='campaigns', lazy=True)

    def __init__(self, name, objective, status, user_id, special_ad_categories=None, meta_campaign_id=None):
        self.name = name
        self.objective = objective
        self.status = status
        self.user_id = user_id
        self.special_ad_categories = special_ad_categories or "NONE"
        self.meta_campaign_id = meta_campaign_id or str(uuid.uuid4())  # Generate UUID if not provided

    def __repr__(self):
        return f'<Campaign {self.name}>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "objective": self.objective,
            "status": self.status,
            "special_ad_categories": self.special_ad_categories,
            "meta_campaign_id": self.meta_campaign_id,
            "user_id": self.user_id,
        }


# ==========================
# AdGroup Model
# ==========================
class AdGroup(db.Model):
    __tablename__ = 'ad_groups'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    daily_budget = db.Column(db.Float, nullable=False)
    countries = db.Column(db.JSON, nullable=True)
    billing_event = db.Column(db.String(50), nullable=True)  # New field
    bid_strategy = db.Column(db.String(50), nullable=True)   # New field
    bid_amount = db.Column(db.Float, nullable=True)          # New field
    roas_average_floor = db.Column(db.Float, nullable=True)  # New field
    optimization_goal = db.Column(db.String(50), nullable=True)  # New field
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id', ondelete="CASCADE"), nullable=False)
    meta_ad_group_id = db.Column(db.String(255), nullable=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Add the targeting field to the model
    targeting = db.Column(db.JSON, nullable=True)  # This will store targeting data

    # Relationships
    campaign = db.relationship('Campaign', backref=db.backref('ad_groups', cascade="all, delete-orphan", lazy=True))
    user = db.relationship('User', back_populates='ad_groups', lazy=True)

    def __repr__(self):
        return f'<AdGroup {self.name}>'

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "status": self.status,
            "daily_budget": self.daily_budget,
            "countries": self.countries,
            "billing_event": self.billing_event,  # Include new field
            "bid_strategy": self.bid_strategy,    # Include new field
            "bid_amount": self.bid_amount,        # Include new field
            "roas_average_floor": self.roas_average_floor,  # Include new field
            "optimization_goal": self.optimization_goal,  # Include new field
            "campaign_id": self.campaign_id,
            "meta_ad_group_id": self.meta_ad_group_id,
            "user_id": self.user_id,
            "targeting": self.targeting,  # Include the new targeting field
        }


# ==========================
# Ad Model
# ==========================
class Ad(db.Model):
    __tablename__ = 'ads'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    status = db.Column(db.String(50), nullable=False)
    ad_group_id = db.Column(db.Integer, db.ForeignKey('ad_groups.id'), nullable=False)
    meta_ad_id = db.Column(db.String(255), nullable=True)
    meta_creative_id = db.Column(db.String(255), nullable=True)  # New field for Meta Creative ID
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Relationships
    ad_group = db.relationship('AdGroup', backref=db.backref('ads', lazy=True))
    user = db.relationship('User', back_populates='ads', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'status': self.status,
            'ad_group_id': self.ad_group_id,
            'meta_ad_id': self.meta_ad_id,
            'meta_creative_id': self.meta_creative_id,  # Include the Meta Creative ID in the dict
            'user_id': self.user_id,
        }


# ==========================
# AdCreative Model
# ==========================
class AdCreative(db.Model):
    __tablename__ = 'ad_creatives'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    creative_id = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    page_id = db.Column(db.String(255), nullable=False)
    link = db.Column(db.String(255), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    image = db.Column(db.String(255), nullable=False)
    cta_type = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    caption = db.Column(db.String(255), nullable=True)  # Add the caption field

    # Relationship
    user = db.relationship('User', back_populates='ad_creatives', lazy=True)

    def __repr__(self):
        return f"<AdCreative {self.name}>"

    def to_dict(self):
        return {
            'id': self.id,
            'creative_id': self.creative_id,
            'name': self.name,
            'page_id': self.page_id,
            'link': self.link,
            'message': self.message,
            'image': self.image,
            'cta_type': self.cta_type,
            'user_id': self.user_id,
            'caption': self.caption,  # Include the caption field in the dictionary
        }
