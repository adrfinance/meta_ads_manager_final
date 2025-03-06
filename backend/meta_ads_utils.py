from datetime import datetime, timezone
import requests
import os
from dotenv import load_dotenv
import json
from flask import current_app as app  # Add this import to use app context
from backend.models import Campaign  # Adjust the import path based on where your models are defined
import logging

# Load environment variables from .env file
load_dotenv()

# Initialize logger for error tracking
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def create_meta_campaign(name, status, start_date, end_date):
    try:
        # Meta Ads API endpoint (using the AD_ACCOUNT_ID from .env)
        ad_account_id = os.getenv('AD_ACCOUNT_ID')  # Get the AD_ACCOUNT_ID from the .env file
        url = f'https://graph.facebook.com/v22.0/act_{ad_account_id}/campaigns'
        
        access_token = os.getenv('META_ACCESS_TOKEN')  # Retrieve the Meta Ads access token from the environment
        
        # Ensure the start and end dates are in ISO 8601 format (convert Unix timestamp to string)
        start_time = datetime.fromtimestamp(start_date, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # Convert Unix timestamp to ISO 8601 format with timezone
        end_time = datetime.fromtimestamp(end_date, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")  # Convert Unix timestamp to ISO 8601 format with timezone

        # Debugging: print values for troubleshooting
        print(f"Start Time: {start_time}, End Time: {end_time}")  # Debugging print
        print(f"Name: {name}, Status: {status}, Access Token: {access_token}")  # Ensure these values are being passed correctly

        # Construct the payload (data) for the campaign
        payload = {
            'name': name,
            'objective': 'LINK_CLICKS',  # Can be customized, but 'LINK_CLICKS' as per the example
            'status': status,
            'start_time': start_time,  # Use start_time in ISO 8601 format
            'end_time': end_time,      # Use end_time in ISO 8601 format
            'access_token': access_token
        }

        # Use multipart/form-data as per Meta's example
        response = requests.post(url, data=payload)
        
        # Debugging: print the response for troubleshooting
        print(f"Response status code: {response.status_code}")
        print(f"Response body: {response.text}")

        # Check if the response status is 200 or 201 and process accordingly
        if response.status_code in [200, 201]:
            data = response.json()  # Parse the JSON response body
            print(f"Campaign created successfully. Response: {data}")
            return data['id']  # Return the Meta campaign ID from the response
        else:
            # If the API request failed, print the response content for debugging
            print(f"Error response received: {response.text}")
            raise Exception(f"Error creating campaign on Meta Ads: {response.text}")
    
    except requests.exceptions.RequestException as e:
        # Catch request-related exceptions like timeouts or connection issues
        logger.error(f"Request error in create_meta_campaign: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Error in create_meta_campaign: {str(e)}")
        raise e  # Reraise the exception to be caught by the caller

# Function to delete a Meta campaign
def delete_meta_campaign(campaign_id):
    try:
        # Meta Ads API endpoint to delete the campaign (using the campaign ID)
        url = f'https://graph.facebook.com/v22.0/{campaign_id}'
        
        # Access token from environment
        access_token = os.getenv('META_ACCESS_TOKEN')
        
        # Parameters for the request
        params = {
            'access_token': access_token
        }

        # Send DELETE request to Facebook
        response = requests.delete(url, params=params)

        # Debugging: print the response for troubleshooting
        print(f"Delete Response status code: {response.status_code}")
        print(f"Delete Response body: {response.text}")

        if response.status_code == 200:
            print(f"Campaign {campaign_id} deleted successfully.")
            return True
        else:
            print(f"Error deleting campaign {campaign_id}: {response.text}")
            return False
    
    except requests.exceptions.RequestException as e:
        # Catch request-related exceptions like timeouts or connection issues
        logger.error(f"Request error in delete_meta_campaign: {str(e)}")
        raise e
    except Exception as e:
        logger.error(f"Error in delete_meta_campaign: {str(e)}")
        raise e  # Reraise the exception to be caught by the caller

# Minimum daily budget threshold (in EUR or equivalent currency)
MIN_BUDGET = 0.96  # Adjust this for the local currency if necessary

# Define valid performance goals for each combination of ad objective and conversion location
valid_performance_goals = {
    "Awareness": {
        "": ["Maximize reach of ads", "Maximize number of impressions", "Maximize ad recall lift"],
        "Video views": ["Maximize ThruPlay views", "Maximize 2-second continuous video views"]
    },
    "Traffic": {
        "Website": ["Maximize number of landing page views", "Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of conversations", "Maximize number of impressions"],
        "App": ["Maximize number of link clicks", "Maximize daily unique reach"],
        "Messaging apps": ["Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of conversations", "Maximize number of impressions"],
        "Instagram profile": ["Maximize number of Instagram profile visits"],
        "Calls": ["Maximize number of calls"]
    },
    "Engagement": {
        "Messaging apps": ["Maximize number of conversations", "Maximize number of link clicks", "Maximize daily unique reach"],
        "On your ad": ["Maximize number of impressions"],
        "Video views": ["Maximize ThruPlay views", "Maximize 2-second continuous video views"],
        "Post engagement": ["Maximize engagement with a post", "Maximize daily unique reach", "Maximize number of impressions"],
        "Event responses": ["Maximize number of event responses", "Maximize engagement with a post", "Maximize daily unique reach", "Maximize number of impressions"],
        "Group joins": ["Maximize number of link clicks"],
        "Reminders set": ["Maximize reminders set"],
        "Calls": ["Maximize number of calls"],
        "Website": ["Maximize number of conversions", "Maximize number of landing page views", "Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of impressions"],
        "App": ["Maximize number of app events", "Maximize number of link clicks", "Maximize daily unique reach"]
    },
    "Leads": {
        "Website": ["Maximize number of conversions", "Maximize number of landing page views", "Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of impressions"],
        "Instant forms": ["Maximize number of leads", "Maximize number of conversion leads"],
        "Messenger": ["Maximize number of leads"],
        "Instagram": ["Maximize number of leads"],
        "Calls": ["Maximize number of calls"]
    },
    "Sales": {
        "Website and shop": ["Maximize number of conversions", "Maximize value of conversions"],
        "Website": ["Maximize number of conversions", "Maximize value of conversions", "Maximize number of landing page views", "Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of impressions"],
        "App": ["Maximize number of app events", "Maximize number of link clicks", "Maximize daily unique reach", "Maximize number of impressions"],
        "Website and app": ["Maximize number of conversions"],
        "Messaging apps": ["Maximize number of conversations", "Maximize number of conversions", "Maximize number of link clicks", "Maximize daily unique reach"],
        "Calls": ["Maximize number of calls"],
        "Catalog sales": ["Maximize number of conversions", "Maximize value of conversions", "Maximize number of link clicks", "Maximize number of impressions"]
    }
}

def create_meta_ad_group(name, campaign_id, daily_budget, conversion_location, objective, optimization_goal=None):
    if daily_budget < MIN_BUDGET:
        app.logger.error(f"Daily budget must be at least {MIN_BUDGET} EUR (or equivalent in your currency).")
        return None  # Prevent sending the request if the budget is too low
    
    access_token = os.getenv('META_ACCESS_TOKEN')
    ad_account_id = os.getenv('AD_ACCOUNT_ID')
    
    # Fetch the campaign from the database using the campaign_id
    campaign = Campaign.query.get(campaign_id)
    
    if not campaign:
        app.logger.error(f"Campaign with ID {campaign_id} not found.")
        return None
    
    meta_campaign_id = campaign.meta_campaign_id  # Use the meta_campaign_id from the campaign table
    if not meta_campaign_id:
        app.logger.error(f"Meta campaign ID not found for campaign with ID {campaign_id}.")
        return None
    
    # Get valid performance goals based on the objective and conversion location
    valid_goals = valid_performance_goals.get(objective, {}).get(conversion_location, [])
    
    # Ensure optimization_goal is valid for the selected objective and conversion location
    if optimization_goal is None or optimization_goal not in valid_goals:
        # Default to a valid goal if not provided or invalid
        optimization_goal = valid_goals[0] if valid_goals else "Maximize number of impressions"
        app.logger.info(f"Using default optimization goal '{optimization_goal}' for objective '{objective}' and conversion location '{conversion_location}'.")

    # Prepare the data to send to Meta API
    url = f'https://graph.facebook.com/v22.0/act_{ad_account_id}/adsets'
    
    # Prepare the data to send to Meta API (same as before)
    payload = {
        'name': name,
        'campaign_id': meta_campaign_id,
        'daily_budget': daily_budget,
        'targeting': json.dumps({"geo_locations": {"countries": ["US"]}}),
        'access_token': access_token,
        'optimization_goal': optimization_goal,  # Ensure compatibility between optimization_goal and campaign objective
    }
    
    # Send POST request to Meta API and handle the response
    response = requests.post(url, data=payload)
    
    if response.status_code == 200:
        data = response.json()
        return data.get('id')  # Return Meta ad group ID
    else:
        app.logger.error(f"Error creating Meta ad group: {response.status_code} - {response.text}")
        return None


