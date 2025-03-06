import json
from sqlite3 import IntegrityError
from flask import Blueprint, jsonify, make_response, request, session, current_app
from flask_login import current_user
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import User, Campaign, AdGroup, Ad, AdCreative
from backend.app import db
import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timezone
from sqlalchemy import text
from backend.meta_ads_utils import create_meta_campaign, delete_meta_campaign, create_meta_ad_group  # Import the utility function
import logging
from flask import current_app as app  # Add this import
from flask import request, jsonify, make_response, url_for, redirect, abort
from urllib.parse import urlparse  # Import urlparse from urllib.parse
from flask_jwt_extended import create_access_token
from flask_jwt_extended import jwt_required, get_jwt_identity
import time
from sqlalchemy.orm import joinedload







META_ACCESS_TOKEN = os.getenv('META_ACCESS_TOKEN')
AD_ACCOUNT_ID = os.getenv('AD_ACCOUNT_ID')
PAGE_ID = os.getenv('PAGE_ID')
# Define your Meta Ads API URL and access token (you can store these in your config or environment variables)
META_ADS_API_URL = "https://graph.facebook.com/v22.0/{ad_group_id}/"  # You can change the API version if necessary


load_dotenv()

routes_bp = Blueprint('routes', __name__)












@routes_bp.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    try:
        # Hash the password using werkzeug's generate_password_hash
        hashed_password = generate_password_hash(password)

        # Try to create and save the new user with the hashed password
        user = User(email=email, _password=hashed_password)
        db.session.add(user)
        db.session.commit()

        return jsonify({"message": "User registered successfully!"}), 201

    except Exception as e:
        db.session.rollback()
        # Catch any other unforeseen errors
        if "UNIQUE constraint failed" in str(e):
            return jsonify({"message": "User already exists"}), 400
        return jsonify({"message": "An error occurred, please try again later."}), 500

    
    











@routes_bp.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"message": "Missing email or password"}), 400

    # Authenticate user
    user = User.query.filter_by(email=email).first()

    if user and check_password_hash(user.password, password):

        # Generate the JWT token here
        access_token = create_access_token(identity=user.id)

        return jsonify({
            "message": "Login successful",
            "user": {
                "email": user.email,
                "id": user.id  # Make sure to include user.id here
            },
            "access_token": access_token  # Send the access token in the response
        }), 200

    return jsonify({"message": "Invalid credentials"}), 401







MAX_RETRIES = 5
BASE_WAIT_TIME = 1.0  # Start with 1 second delay











def make_meta_api_request(url, payload=None, method="POST", headers=None):
    retries = 0
    wait_time = BASE_WAIT_TIME

    while retries < MAX_RETRIES:
        try:
            if method == "POST":
                response = requests.post(url, data=payload, headers=headers)
            elif method == "DELETE":
                # DELETE requests typically use json or params
                response = requests.delete(url, json=payload, headers=headers) if payload else requests.delete(url, headers=headers)
            else:
                response = requests.request(method, url, json=payload, headers=headers)

            data = response.json()

            if response.status_code == 200:
                return data  # Return only the response data (not the status code)

            # Handle rate limiting error
            error_data = data.get("error", {})
            if error_data.get("code") == 80004 and error_data.get("error_subcode") == 2446079:
                print("Rate limit reached. Checking X-Business-Use-Case-Usage header...")
                rate_limit_info = response.headers.get("X-Business-Use-Case-Usage")
                if rate_limit_info:
                    estimated_time = extract_estimated_time(rate_limit_info)
                    if estimated_time:
                        print(f"Rate limit detected. Waiting {estimated_time} minutes before retrying...")
                        time.sleep(estimated_time * 60)
                        continue
                print(f"No estimated recovery time. Retrying in {wait_time} seconds...")
                time.sleep(wait_time)
                wait_time *= 2  # Exponential backoff
                retries += 1
                continue


            # Check if error_user_msg exists and return it
            error_user_msg = error_data.get("error_user_msg")
            if error_user_msg:
                return {"error": error_user_msg}

            print(f"Meta API Error: {data}")
            return data  # Return only the error data

        except requests.exceptions.RequestException as e:
            print(f"Network error: {e}")
            return {"error": str(e)}

    print("Max retries reached. Request failed.")
    return {"error": "Rate limit exceeded, retries exhausted"}



















def extract_estimated_time(rate_limit_info):
    try:
        rate_limit_data = json.loads(rate_limit_info)
        for key, limits in rate_limit_data.items():
            for limit in limits:
                if "estimated_time_to_regain_access" in limit:
                    return limit["estimated_time_to_regain_access"]
    except json.JSONDecodeError:
        print("Error parsing rate limit info.")
    return None















@routes_bp.route('/api/campaigns', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def campaigns():
    # Handle campaign creation
    data = request.get_json()
    user_id = get_jwt_identity()

    # Retrieve form data
    name = data.get("name")
    objective = data.get("objective")
    status = data.get("status")
    special_ad_categories = data.get("special_ad_categories", "NONE")  # Default to NONE if not provided

    # Prepare payload for Meta's API
    payload = {
        "name": name,
        "objective": objective,
        "status": status,
        "special_ad_categories": special_ad_categories,
        "access_token": META_ACCESS_TOKEN  # Load from .env
    }

    # Send request to Meta's API with rate limit handling
    api_url = f"https://graph.facebook.com/v22.0/act_{AD_ACCOUNT_ID}/campaigns"
    
    
    print('Payload: ', payload)
    
    # Make the request and unpack the response
    response_data = make_meta_api_request(api_url, payload, method="POST")

    # Check if the response contains an error
    if 'error' in response_data:
        error_msg = response_data.get('error', {}).get('error_user_msg', 'Failed to create campaign due to rate limits or other errors.')
        return jsonify({"error": error_msg}), 400

    if 'id' in response_data:
        meta_campaign_id = response_data['id']  # Get the Meta campaign ID from the response

        # Save campaign details in your own database, including user_id
        new_campaign = Campaign(
            name=name,
            objective=objective,
            status=status,
            special_ad_categories=special_ad_categories,
            meta_campaign_id=meta_campaign_id,
            user_id=user_id  # Pass the authenticated user's ID
        )

        # Save to the database
        db.session.add(new_campaign)
        db.session.commit()

        # Return success response
        return jsonify({
            "message": "Campaign created successfully!",
            "id": new_campaign.id,  # Local DB ID
            "meta_campaign_id": meta_campaign_id  # Meta Campaign ID
        }), 201

    else:
        return jsonify({"error": "Failed to create campaign. No 'id' returned from Meta API."}), 500














@routes_bp.route('/api/campaigns', methods=['GET'])
@jwt_required()
def get_campaigns():
    # Get the current user's identity (user_id) from the JWT
    current_user_id = get_jwt_identity()  # This retrieves the user ID from the token

    # Now, you can use the current_user_id to query the database for that user's campaigns
    campaigns = Campaign.query.filter_by(user_id=current_user_id).all()

    return jsonify([campaign.to_dict() for campaign in campaigns])






@routes_bp.route('/api/ad-groups', methods=['POST'])
@jwt_required()
def create_adgroup():
    data = request.json

    # Extract campaign_id from the request
    campaign_id = data.get('campaign_id')
    if not campaign_id:
        return jsonify({'error': 'Campaign ID is required'}), 400

    # Retrieve campaign from the database
    campaign = db.session.query(Campaign).filter_by(id=campaign_id).first()
    if not campaign:
        return jsonify({'error': 'Campaign not found'}), 404

    # Use the Meta campaign ID instead
    meta_campaign_id = campaign.meta_campaign_id

    # Extract and validate targeting data
    targeting = data.get('targeting')
    if isinstance(targeting, str):
        try:
            targeting = json.loads(targeting)  # Convert string to dictionary
        except json.JSONDecodeError:
            return jsonify({'error': 'Invalid JSON for targeting'}), 400

    if not isinstance(targeting, dict):
        return jsonify({'error': 'Targeting must be a dictionary'}), 400

    # Validate bid strategy-specific fields
    bid_strategy = data.get('bid_strategy')
    bid_amount = data.get('bid_amount')
    roas_average_floor = data.get('roas_average_floor')
    optimization_goal = data.get('optimization_goal')

    if bid_strategy == 'LOWEST_COST_WITH_BID_CAP' and not bid_amount:
        return jsonify({'error': 'Bid amount required for LOWEST_COST_WITH_BID_CAP'}), 400

    if bid_strategy == 'LOWEST_COST_WITH_MIN_ROAS' and (not roas_average_floor or not optimization_goal):
        return jsonify({'error': 'ROAS floor & optimization goal required for LOWEST_COST_WITH_MIN_ROAS'}), 400

    # Ensure proper type conversion for numeric fields
    try:
        daily_budget = int(float(data['daily_budget']))  # Convert to integer
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid value for daily_budget'}), 400

    try:
        bid_amount = int(float(bid_amount)) if bid_amount else None  # Convert bid amount to integer
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid value for bid_amount'}), 400

    try:
        roas_average_floor = int(float(roas_average_floor)) if roas_average_floor else None  # Convert ROAS floor to integer
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid value for roas_average_floor'}), 400

    # Prepare data for Meta API request
    ad_group_data = {
        'name': data['name'],
        'daily_budget': daily_budget,
        'campaign_id': meta_campaign_id,  # Use Meta campaign ID
        'targeting': json.dumps(targeting),  # Ensure targeting is a JSON string
        'billing_event': data.get('billing_event'),
        'access_token': META_ACCESS_TOKEN
    }

    if bid_strategy == 'LOWEST_COST_WITH_BID_CAP':
        ad_group_data['bid_amount'] = bid_amount
    elif bid_strategy == 'LOWEST_COST_WITH_MIN_ROAS':
        ad_group_data['roas_average_floor'] = roas_average_floor
        ad_group_data['optimization_goal'] = optimization_goal

    # Make request to Meta API with rate limit handling
    api_url = f'https://graph.facebook.com/v22.0/act_{AD_ACCOUNT_ID}/adsets'
    response_data = make_meta_api_request(api_url, ad_group_data, method="POST")

    if response_data and response_data.get('id'):
        # Store ad group in database with all fields
        meta_ad_group_id = response_data.get('id')
        user_id = get_jwt_identity()

        ad_group = AdGroup(
            name=data['name'],
            status='ACTIVE',
            daily_budget=daily_budget,
            countries=data.get('countries', []),
            campaign_id=campaign_id,
            meta_ad_group_id=meta_ad_group_id,
            user_id=user_id,
            targeting=targeting,  # Store the targeting
            bid_strategy=bid_strategy,  # Store the bid strategy
            bid_amount=bid_amount,  # Store the bid amount
            roas_average_floor=roas_average_floor,  # Store the ROAS floor
            optimization_goal=optimization_goal,  # Store the optimization goal
            billing_event=data.get('billing_event'),  # Store billing event
        )

        db.session.add(ad_group)
        db.session.commit()

        return jsonify({'message': 'Ad group created successfully', 'ad_group_id': ad_group.id}), 201

    # Handle failure for Meta API request
    error_message = response_data.get('error', {}).get('message', 'Unknown error')
    return jsonify({'error': 'Failed to create ad group due to Meta API error', 'details': error_message}), 400

















    
    
    
@routes_bp.route('/api/ad-groups', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ad_groups():
    try:
        # Get the user_id from the JWT token
        user_id = get_jwt_identity()

        # Querying ad_groups for the logged-in user using ORM
        ad_groups = AdGroup.query.filter_by(user_id=user_id).all()

        # Convert each AdGroup to dictionary
        ad_groups_data = [ad_group.to_dict() for ad_group in ad_groups]

        return jsonify(ad_groups_data), 200
    except Exception as e:
        logging.error(f"Error occurred: {str(e)}")  # Log the error for debugging
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
  





# /api/ads route
@routes_bp.route('/api/ads', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ads():
    user_id = get_jwt_identity()  # Get the user_id from the JWT token

    try:
        # Query ads for the logged-in user
        ads = Ad.query.filter_by(user_id=user_id).all()

        # Return the ads as a list of dictionaries
        return jsonify([ad.to_dict() for ad in ads]), 200
    except Exception as e:
        logging.error(f"Error occurred: {str(e)}")  # Log the error for debugging
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
    
    
    
    
    
    

    
    
    
    
    
    
@routes_bp.route('/api/campaigns/<int:id>', methods=['PUT'])
@jwt_required()
def edit_campaign(id):
    data = request.get_json()

    # Retrieve the campaign from the database
    campaign = Campaign.query.get(id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    # Retrieve updated campaign data
    name = data.get("name", campaign.name)
    objective = data.get("objective", campaign.objective)
    status = data.get("status", campaign.status)

    # Prepare payload for Meta API
    payload = {
        "name": name,
        "objective": objective,
        "status": status,
        "access_token": META_ACCESS_TOKEN
    }

    # Send request to Meta's API to update the campaign
    api_url = f"https://graph.facebook.com/v22.0/{campaign.meta_campaign_id}"
    response_data = make_meta_api_request(api_url, payload, method="POST")

    if response_data:
        # Update the campaign in your database
        campaign.name = name
        campaign.objective = objective
        campaign.status = status
        db.session.commit()

        return jsonify({"message": "Campaign updated successfully!"}), 200

    return jsonify({"error": "Failed to update campaign due to rate limits or other errors"}), 400





# /api/campaigns/<int:id> route to fetch a specific campaign
@routes_bp.route('/api/campaigns/<int:id>', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_campaign(id):
    campaign = Campaign.query.get(id)
    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404
    
    return jsonify(campaign.to_dict())



# /api/ad-groups/<int:id> route to fetch a specific campaign
@routes_bp.route('/api/ad-groups/<int:id>', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ad_route(id):
    adgroup = AdGroup.query.get(id)
    if not adgroup:
        return jsonify({"error": "Ad Group not found"}), 404
    
    return jsonify(adgroup.to_dict())












@routes_bp.route("/api/campaigns/<int:campaign_id>", methods=["DELETE"])
@jwt_required()
def delete_campaign(campaign_id):
    campaign = Campaign.query.get(campaign_id)

    if not campaign:
        return jsonify({"error": "Campaign not found"}), 404

    meta_campaign_id = campaign.meta_campaign_id  # Ensure this exists in your model

    # Step 1: Delete from Meta Ads API with rate limit handling
    meta_url = f"https://graph.facebook.com/v22.0/{meta_campaign_id}"
    headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}

    # Ensure payload is passed as an empty dictionary for DELETE request
    payload = {}

    # Make request to Meta API
    meta_response_data = make_meta_api_request(meta_url, payload=payload, method="DELETE", headers=headers)

    # Check if the response contains an error or not
    if 'error' in meta_response_data:
        error_msg = meta_response_data.get('error', {}).get('error_user_msg', 'Failed to delete from Meta API due to rate limits or other errors')
        return jsonify({"error": error_msg}), 500

    # Step 2: Delete related records from our database
    try:
        # Delete related ads efficiently
        Ad.query.filter(Ad.ad_group_id.in_(
            db.session.query(AdGroup.id).filter_by(campaign_id=campaign_id)
        )).delete(synchronize_session=False)

        # Delete related ad groups
        AdGroup.query.filter_by(campaign_id=campaign_id).delete(synchronize_session=False)

        # Now delete the campaign
        db.session.delete(campaign)
        db.session.commit()

        return jsonify({"message": "Campaign deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Database deletion failed: {str(e)}"}), 500









    
    
    
    
    
    
    
    
    
@routes_bp.route('/api/ad-groups/<int:ad_group_id>', methods=['PUT'])
@jwt_required()
def update_ad_group(ad_group_id):
    data = request.get_json()

    ad_group = AdGroup.query.get_or_404(ad_group_id)

    try:
        # Parse countries if it's in string format (JSON string)
        countries = data.get('targeting', {}).get('geo_locations', {}).get('countries', [])
        if isinstance(countries, str):
            try:
                countries = json.loads(countries)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON format for countries"}), 400

        # Parse the targeting field to ensure proper format
        targeting_data = data.get('targeting', {})
        if isinstance(targeting_data, str):
            try:
                targeting_data = json.loads(targeting_data)
            except json.JSONDecodeError:
                return jsonify({"error": "Invalid JSON format for targeting"}), 400

        # Ensure targeting is an associative array (dict)
        if not isinstance(targeting_data, dict):
            return jsonify({"error": "Targeting should be an associative array (dictionary)"}), 400
        
        # Build the targeting spec
        simplified_targeting = {
            "geo_locations": {"countries": countries},
            "facebook_positions": targeting_data.get('facebook_positions', ['feed']),
            # You can add other targeting options here as necessary
        }

        # Serialize the targeting spec to a JSON string
        serialized_targeting = json.dumps(simplified_targeting)

        # Prepare the data for Meta API
        meta_update_data = {
            "name": data.get('name'),
            "billing_event": data.get('billing_event'),
            "optimization_goal": data.get('optimization_goal'),
            "bid_amount": data.get('bid_amount'),
            "targeting": serialized_targeting,  # Pass the JSON string here
            "daily_budget": data.get('daily_budget')
        }

        # Clean up None values
        meta_update_data = {k: v for k, v in meta_update_data.items() if v is not None}

        # Print to debug the payload

        # Use the helper function for the request
        url = f'https://graph.facebook.com/v22.0/{ad_group.meta_ad_group_id}'
        headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
        response_data = make_meta_api_request(url, meta_update_data, method="POST", headers=headers)
        
        print('Response data: ', response_data)
        print(type(response_data))

        if isinstance(response_data, dict) and 'error' in response_data:
            print('I get here')

            # Access the error message from the dictionary
            error_msg = response_data.get('error', '')
            print(f"Error message: {error_msg}")
            
            if error_msg:
                print('Returning error_msg')
                return jsonify({"error": error_msg}), 400  # Return the error message if no 'error_user_msg'

        elif isinstance(response_data, str):
            # If response_data is a string, directly return it
            print('Returning error string')
            return jsonify({"error": response_data}), 400

        # If update is successful, update the database
        ad_group.name = data.get('name', ad_group.name)
        ad_group.status = data.get('status', ad_group.status)
        ad_group.daily_budget = data.get('daily_budget', ad_group.daily_budget)
        ad_group.countries = countries

        # Commit the changes to the database
        db.session.commit()

        return jsonify({"message": "Ad group updated successfully", "ad_group": ad_group.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        print('Error: ', e)
        print("Error updating ad group:", str(e))
        return jsonify({"error": "Server error", "details": str(e)}), 500


    
    
    
    
    
    
    
    
 









@routes_bp.route('/api/ad-groups/<int:ad_group_id>', methods=['DELETE'])
@jwt_required()
def delete_ad_group(ad_group_id):
    ad_group = AdGroup.query.get_or_404(ad_group_id)

    try:
        # Fetch all ads associated with this ad group
        ads = Ad.query.filter_by(ad_group_id=ad_group_id).all()

        # Prepare the list of Meta Ad IDs for deletion
        meta_ad_ids = [ad.meta_ad_id for ad in ads if ad.meta_ad_id]  # Ensure that the ad has a valid Meta ad ID
    
        headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}

        # If there are ads to delete from Meta
        if meta_ad_ids:
            url = "https://graph.facebook.com/v22.0"
            headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
            for meta_ad_id in meta_ad_ids:
                delete_url = f"{url}/{meta_ad_id}"
                response = make_meta_api_request(delete_url, method="DELETE", headers=headers)

                # Check if Meta API delete was successful
                if response.get('error'):
                    raise Exception(f"Error deleting Meta ad: {response['error']['message']}")

        # Delete the ad group from Meta (even if there are no ads)
        delete_url = f"https://graph.facebook.com/v22.0/{ad_group.meta_ad_group_id}"
        response = make_meta_api_request(delete_url, method="DELETE", headers=headers)
        print('Ad group delete response: ', response)

        # Check if the Meta API delete was successful
        if response.get('error'):
            raise Exception(f"Error deleting Meta ad group: {response['error']['message']}")

        # Now delete all ads from the database
        Ad.query.filter_by(ad_group_id=ad_group_id).delete()

        # Now delete the ad group from the database
        db.session.delete(ad_group)
        db.session.commit()

        return jsonify({"message": "Ad group and all associated ads deleted successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({"error": "Error deleting ad group or ads", "details": str(e)}), 500





def create_meta_ad(ad_account_id, adset_id, creative_id, name, status):
    """Create an ad on Meta using the Meta API with rate limit handling."""
    url = f"https://graph.facebook.com/v22.0/act_{ad_account_id}/ads"

    # Ensure all required parameters are provided
    if not (ad_account_id and adset_id and creative_id and name):
        print("Error: Missing required parameters for ad creation.")
        return None

    payload = {
        'name': name,
        'adset_id': adset_id,
        'creative': json.dumps({'creative_id': creative_id}),
        'status': status,
        'access_token': os.getenv("META_ACCESS_TOKEN")
    }

    # Use `make_meta_api_request` to handle rate limits & retries
    response_data = make_meta_api_request(url, payload, method="POST")

    if response_data is not None:  # If request was successful
        print(f"✅ Ad '{name}' created successfully on Meta.")
        return response_data
    else:
        print(f"❌ Failed to create ad '{name}'.")
        return None



@routes_bp.route('/api/ads', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def create_ad():
    """API endpoint to create a new ad."""
    data = request.get_json()  # Get the data from the frontend

    try:
        # Fetch environment variables
        ad_account_id = os.getenv("AD_ACCOUNT_ID")  # Your Facebook Ad Account ID
        adset_id = data.get('adset_id')  # The ID of the ad set where the ad will be created
        creative_id = data.get('creative_id')  # The ID of the creative (image/video) for the ad
        name = data.get('name')  # The name of the ad
        status = data.get('status', 'ACTIVE')  # The status of the ad (default is ACTIVE)

        # Validate required fields before calling Meta API
        if not all([ad_account_id, adset_id, creative_id, name]):
            return jsonify({"error": "Missing required fields: adset_id, creative_id, or name"}), 400

        # Prepare the payload for Meta API
        payload = {
            'name': name,
            'adset_id': adset_id,
            'creative': json.dumps({'creative_id': creative_id}),
            'status': status,
            'access_token': os.getenv("META_ACCESS_TOKEN")
        }

        # Use `make_meta_api_request` to handle rate limit & retries
        url = f"https://graph.facebook.com/v22.0/act_{ad_account_id}/ads"
        meta_response = make_meta_api_request(url, payload, method="POST")

        if meta_response:
            return jsonify(meta_response), 201
        else:
            return jsonify({"error": "Failed to create ad on Meta API"}), 500

    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500


    
    
    
@routes_bp.route('/api/ad-creatives', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ad_creatives():
    user_id = get_jwt_identity()  # Get the user_id from the JWT token

    try:
        # Fetch ad creatives for the logged-in user by filtering with user_id
        ad_creatives = AdCreative.query.filter_by(user_id=user_id).all()

        # Convert the query result to a list of dictionaries
        result = []
        for ad_creative in ad_creatives:
            result.append({
                'id': ad_creative.id,
                'creative_id': ad_creative.creative_id,
                'name': ad_creative.name,
                'page_id': ad_creative.page_id,
                'link': ad_creative.link,
                'message': ad_creative.message,
                'image': ad_creative.image,
                'cta_type': ad_creative.cta_type
            })

        # Return the list of ad creatives as JSON
        return jsonify(result), 200
    
    except Exception as e:
        # Handle any errors that occur during the process
        return jsonify({'error': str(e)}), 500
 
    
    
    
    
    
@routes_bp.route('/api/ad-creatives', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def create_ad_creative():
    try:
        data = request.json
        user_id = get_jwt_identity()  # Get the user_id from the JWT token

        # Your payload from the frontend
        payload = {
            'name': data.get('name'),
            'object_story_spec': json.dumps({
                "page_id": PAGE_ID,
                "link_data": {
                    "message": data.get('message'),
                    "link": data.get('link'),
                    "caption": data.get('caption'),
                    "picture": data.get('image'),
                    "call_to_action": {
                        "type": data.get('cta_type')
                    }
                }
            }),
            'access_token': META_ACCESS_TOKEN  # Your function to retrieve Meta's access token
        }

        # Make the API request
        meta_url = "https://graph.facebook.com/v22.0/act_635629056834628/adcreatives"
        response_data = make_meta_api_request(meta_url, payload, method="POST", headers=None)
        
        print('Response data: ', response_data)

        # If there was an error in the response data, return the error message
        if 'error' in response_data:
            # Try to extract the user-friendly error message first
            error_message = response_data['error'].get('error_user_msg') or response_data['error'].get('message', 'Unknown error occurred')
            return jsonify({'error': f'Failed to create Ad Creative on Meta: {error_message}'}), 400



        # Save the Ad Creative in the database
        ad_creative = AdCreative(
            name=data.get('name'),
            link=data.get('link'),
            message=data.get('message'),
            image=data.get('image'),
            cta_type=data.get('cta_type'),
            caption=data.get('caption'),
            creative_id=response_data.get('id'),
            page_id=PAGE_ID,
            user_id=user_id
        )

        # Add to the database
        db.session.add(ad_creative)
        db.session.commit()

        # Return success message if the request is successful
        return jsonify({'message': 'Ad Creative created successfully', 'data': response_data}), 200

    except Exception as e:
        db.session.rollback()  # Ensure to rollback in case of any errors
        return jsonify({'error': str(e)}), 500







@routes_bp.route('/api/ad-creatives/<int:id>', methods=['GET'])
def get_ad_creative(id):
    # Fetch the ad creative by id from the database
    ad_creative = AdCreative.query.get(id)
    
    # If the ad creative is not found, return a 404 error
    if not ad_creative:
        return jsonify({'message': 'AdCreative not found'}), 404
    
    # Return the ad creative data as JSON
    return jsonify(ad_creative.to_dict()), 200




@routes_bp.route('/api/ad-creatives/<int:id>', methods=['PUT'])
@jwt_required()
def update_ad_creative(id):
    try:
        # Step 1: Get the current user (using JWT identity) and fetch the existing ad creative from the database
        user_id = get_jwt_identity()  # Get the user_id from the JWT token
        ad_creative = AdCreative.query.get(id)
        
        if not ad_creative:
            return jsonify({'error': 'Ad Creative not found'}), 404

        # Ensure the user owns the ad creative (optional step for security)
        if ad_creative.user_id != user_id:
            return jsonify({'error': 'You do not have permission to update this ad creative'}), 403

        # Step 2: Get the updated data from the request
        data = request.json

        # Step 3: Update the fields based on the provided data
        ad_creative.name = data.get('name', ad_creative.name)
        ad_creative.link = data.get('link', ad_creative.link)
        ad_creative.message = data.get('message', ad_creative.message)
        ad_creative.image = data.get('image', ad_creative.image)
        ad_creative.cta_type = data.get('cta_type', ad_creative.cta_type)
        ad_creative.caption = data.get('caption', ad_creative.caption)
        ad_creative.page_id = PAGE_ID  # Update the page_id

        # Step 4: Optionally, update the Meta API if necessary (if fields like image, link, etc., are updated)
        meta_payload = {
            'page_id': PAGE_ID,
            'name': ad_creative.name,
            'object_story_spec': json.dumps({
                "page_id": PAGE_ID,
                "link_data": {
                    "message": ad_creative.message,
                    "link": ad_creative.link,
                    "caption": ad_creative.caption,
                    "picture": ad_creative.image,
                    "call_to_action": {
                        "type": ad_creative.cta_type
                    }
                }
            }),
            'access_token': META_ACCESS_TOKEN
        }

        # Update the ad creative on Meta API if needed
        meta_url = f"https://graph.facebook.com/v22.0/{ad_creative.creative_id}"
        response_data = make_meta_api_request(meta_url, meta_payload, method="POST")
        
        print('Response data: ', response_data)

        # Check for error in response_data and extract the user message
        if isinstance(response_data, dict) and response_data.get('error'):
            error_msg = response_data['error']
            return jsonify({'error': f'Failed to update Ad Creative on Meta: {error_msg}'}), 400

        # Step 5: Commit changes to the database
        db.session.commit()

        # Step 6: Return the updated ad creative details as a response
        return jsonify({'message': 'Ad Creative updated successfully', 'data': response_data}), 200

    except Exception as e:
        db.session.rollback()  # Rollback in case of error
        print('ERROR: ', str(e))
        return jsonify({'error': str(e)}), 500













@routes_bp.route('/api/create-ad', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def create_ad_v2():
    """Creates an ad in Meta Ads API and stores it in the local database."""
    try:
        # JWT identity will give the user ID from the token
        user_id = get_jwt_identity()
        data = request.get_json()
        print('Received Data:', data)

        # Validate incoming data
        name = data.get('name')
        ad_group_id = data.get('adsetId')  # Local ad group ID
        creative_id = data.get('creativeId')
        status = data.get('status', 'ACTIVE')

        if not all([name, ad_group_id, creative_id]):
            return jsonify({"error": "Missing required parameters (name, adset_id, creative_id)"}), 400

        # Query the ad_groups table to get the corresponding meta_ad_group_id
        ad_group = AdGroup.query.get(ad_group_id)
        if not ad_group:
            return jsonify({"error": "Ad group not found"}), 404

        # Extract the Meta ad group ID
        meta_ad_group_id = ad_group.meta_ad_group_id
        if not meta_ad_group_id:
            return jsonify({"error": "meta_ad_group_id not found for the provided ad group"}), 404

        # Prepare the payload for Meta API
        payload = {
            'name': name,
            'adset_id': meta_ad_group_id,  # Use the Meta ad group ID
            'creative': json.dumps({'creative_id': creative_id}),
            'status': status,
            'access_token': META_ACCESS_TOKEN
        }

        # Meta Ads API URL
        url = f'https://graph.facebook.com/v22.0/act_{AD_ACCOUNT_ID}/ads'

        # Make request to Meta API
        meta_response = make_meta_api_request(url, payload, method="POST", headers=None)
        
        print('Meta Response:', meta_response)
        print('Meta Response Type:', type(meta_response))

        # Check if the response contains the 'id' field (indicating the ad was created successfully)
        if 'error' not in meta_response and 'id' in meta_response:
            meta_ad_id = meta_response['id']
            print('Created Ad ID from Meta:', meta_ad_id)

            # Insert the new ad into the database, including the meta_creative_id
            try:
                new_ad = Ad(
                    name=name,
                    status=status,
                    ad_group_id=ad_group_id,  # Store the local ad group ID
                    meta_ad_id=meta_ad_id,
                    meta_creative_id=creative_id,  # Store the creative ID
                    user_id=user_id  # Extract user ID from JWT
                )
                db.session.add(new_ad)
                db.session.commit()

                return jsonify({"message": "Ad created successfully", "ad_data": meta_response}), 201

            except Exception as db_error:
                print(f'Database Error: {db_error}')
                db.session.rollback()
                return jsonify({"error": "Failed to save ad to database"}), 500

        else:
            # Handle Meta API error
            error_msg = meta_response.get('error', {}).get('error_user_msg', 'An unknown error occurred')
            print('Meta API Error:', error_msg)
            return jsonify({"error": error_msg}), 500

    except Exception as e:
        print(f'Request Exception: {e}')
        return jsonify({"error": "Failed to connect to Meta API"}), 500

    
    
    
    
    
    
    
    
    
    
    

@routes_bp.route('/api/ad-creatives/<int:id>', methods=['DELETE'])
def delete_ad_creative(id):
    try:
        # Fetch the ad creative from the local database
        ad_creative = AdCreative.query.get(id)

        if not ad_creative:
            return jsonify({'error': 'Ad Creative not found'}), 404

        meta_ad_creative_id = ad_creative.creative_id  # Assuming `creative_id` is the ID used in Meta API

        meta_url = f"https://graph.facebook.com/v22.0/{meta_ad_creative_id}"
        headers = {
            'Authorization': f'Bearer {META_ACCESS_TOKEN}'
        }

        # Use the make_meta_api_request function to handle the delete request
        response_data = make_meta_api_request(meta_url, payload=None, method="DELETE", headers=headers)

        # If there was an error in the response data, return the error message
        if 'error' in response_data:
            return jsonify({'error': f'Failed to delete Ad Creative from Meta: {response_data["error"]}'}), 400

        # Step 2: Delete the ad creative from the local database
        db.session.delete(ad_creative)
        db.session.commit()

        return jsonify({'message': 'Ad Creative deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


    
    
    
    
@routes_bp.route('/api/ad-sets', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ad_sets():
    try:
        # Get the user ID from the JWT
        user_id = get_jwt_identity()

        # Query the database to get ad sets belonging to the logged-in user
        ad_sets = AdGroup.query.filter_by(user_id=user_id).all()

        # If no ad sets found
        if not ad_sets:
            return jsonify([]), 200  # Return an empty list instead of an error

        # Convert ad sets to dictionary format for JSON response
        ad_sets_data = [ad_set.to_dict() for ad_set in ad_sets]

        return jsonify(ad_sets_data), 200

    except Exception as e:
        return jsonify({'error': 'An error occurred', 'message': str(e)}), 500    
    
    
    
    
    
    
    
    
@routes_bp.route('/api/delete-ad/<int:id>', methods=['DELETE'])
@jwt_required()  # Ensure the request has a valid JWT token
def delete_ad(id):
    """Deletes an ad from Meta Ads API and removes it from the database."""
    
    print('Received request to delete ad with local DB ID:', id)

    # Query the database using the local DB ID to get the ad
    ad = Ad.query.filter_by(id=id).first()

    if not ad:
        return jsonify({"error": "Ad not found"}), 404

    # Retrieve the Meta Ad ID from the local DB entry (ad.meta_ad_id)
    meta_ad_id = ad.meta_ad_id  # Assuming the column name is 'meta_ad_id'

    if not meta_ad_id:
        return jsonify({"error": "Meta Ad ID not found for this ad"}), 400

    print(f"Meta Ad ID to be deleted: {meta_ad_id}")

    # Meta Ads API URL for deleting the ad
    url = f'https://graph.facebook.com/v22.0/{meta_ad_id}'

    # Prepare payload with access_token
    payload = {'access_token': META_ACCESS_TOKEN}

    try:
        # Use make_meta_api_request to handle the request and retries
        meta_response = make_meta_api_request(url, payload, method="DELETE")
        
        print('Meta response: ', meta_response)

        # Check if the response contains 'success': True
        if meta_response.get('success') == True:
            # Successfully deleted the ad from Meta API
            try:
                # Now delete from local database
                db.session.delete(ad)
                db.session.commit()
                return jsonify({"message": "Ad deleted successfully"}), 200
            except Exception as db_error:
                db.session.rollback()
                print(f'Database Error: {db_error}')
                return jsonify({"error": "Failed to delete ad from database"}), 500
        else:
            # If Meta API deletion was unsuccessful
            return jsonify({"error": "Failed to delete ad from Meta"}), 400

    except requests.exceptions.RequestException as e:
        print(f'Request Exception: {e}')
        return jsonify({"error": "Failed to connect to Meta API"}), 500












@routes_bp.route('/api/edit-ad/<int:ad_id>', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def edit_ad(ad_id):
    try:
        ad = Ad.query.get(ad_id)
        if not ad:
            return jsonify({'error': 'Ad not found'}), 404

        data = request.json
        print('Data: ', data)
        
        ad.name = data['name']
        ad.status = data['status']

        # Assuming meta_ad_id is used to update the Meta API (this logic should be added here)
        meta_ad_id = ad.meta_ad_id

        # Make the call to the Meta API (Example)
        meta_api_url = f'https://graph.facebook.com/v22.0/{meta_ad_id}'
        params = {
            'access_token': META_ACCESS_TOKEN,
            'name': ad.name,
            'status': ad.status
        }
        headers = {
            'Authorization': f'Bearer {META_ACCESS_TOKEN}'  # Adding the access token in the header
        }

        # Pass the params as payload to the make_meta_api_request function
        response_data = make_meta_api_request(meta_api_url, payload=params, method="POST", headers=headers)

        if response_data.get('error'):
            return jsonify({'error': 'Error updating ad on Meta API', 'details': response_data}), 500

        # If Meta API returns success
        if response_data.get('success'):
            db.session.commit()  # Commit changes to the database
            print('Ad updated successfully')
            return jsonify({'message': 'Ad updated successfully'}), 200
        else:
            return jsonify({'error': 'Unexpected error response from Meta API', 'details': response_data}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
    
    
@routes_bp.route('/api/ad/<int:ad_id>', methods=['GET'])
@jwt_required()  # Ensure the request has a valid JWT token
def get_ad(ad_id):
    try:
        # Query the ad by the given ad_id and load the related ad group
        ad = Ad.query.options(joinedload(Ad.ad_group)).get(ad_id)
        
        # Check if the ad exists
        if not ad:
            return jsonify({'error': 'Ad not found'}), 404

        # Return the ad data in a structured way, including the related ad group
        return jsonify(ad.to_dict()), 200

    except Exception as e:
        # Log the error (you can replace print with proper logging)
        app.logger.error(f"Error fetching ad {ad_id}: {e}")
        return jsonify({'error': str(e)}), 500   
    
    

 
 
 
 
 # Route to update the ad in the Meta Ads API and then in the database
@routes_bp.route('/api/edit-ad/<int:ad_id>', methods=['POST'])
@jwt_required()  # Ensure the request has a valid JWT token
def edit_ad_v2(ad_id):
    # Retrieve the ad data from the request body
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract the ad data from the request
    name = data.get('name')
    ad_group_id = data.get('ad_group_id')
    meta_creative_id = data.get('meta_creative_id')
    status = data.get('status')

    if not name or not ad_group_id or not meta_creative_id or not status:
        return jsonify({'error': 'Missing required fields'}), 400

    # Step 1: Update the ad in the Meta Ads API
    meta_ad_url = f'https://graph.facebook.com/v22.0/{ad_id}'
    meta_ad_params = {
        'name': name,
        'ad_group_id': ad_group_id,
        'creative': {'creative_id': meta_creative_id},
        'status': status,
        'access_token': META_ACCESS_TOKEN,
    }

    # Call the make_meta_api_request function instead of direct requests.post
    status_code, meta_response = make_meta_api_request(meta_ad_url, meta_ad_params, method="POST")

    if status_code != 200:
        return jsonify({'error': 'Failed to update the ad in Meta API', 'details': meta_response}), 500

    # Step 2: Update the ad in the local database
    ad = Ad.query.get(ad_id)

    if not ad:
        return jsonify({'error': 'Ad not found'}), 404

    # Update the ad in the database
    ad.name = name
    ad.ad_group_id = ad_group_id
    ad.meta_creative_id = meta_creative_id
    ad.status = status

    db.session.commit()  # Commit the changes to the database

    return jsonify({'message': 'Ad updated successfully'}), 200
