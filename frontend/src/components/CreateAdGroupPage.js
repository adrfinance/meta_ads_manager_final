import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';  // Import the Modal component


const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const CreateAdGroupComponent = () => {
  const [adGroupData, setAdGroupData] = useState({
    name: '',
    campaign_id: '',
    daily_budget: '',
    countries: [],
    billing_event: '',
    bid_strategy: '',
    bid_amount: '',
    roas_average_floor: '',
    optimization_goal: '',
  });

  const [availableCountries, setAvailableCountries] = useState([
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France',
  ]);

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noCampaigns, setNoCampaigns] = useState(false); // New state to track if no campaigns exist
  const [showModal, setShowModal] = useState(false); // State to control modal visibility

  const navigate = useNavigate();

  const validOptimizationGoals = [
    'NONE', 'APP_INSTALLS', 'AD_RECALL_LIFT', 'ENGAGED_USERS', 'EVENT_RESPONSES',
    'IMPRESSIONS', 'LEAD_GENERATION', 'QUALITY_LEAD', 'LINK_CLICKS', 'OFFSITE_CONVERSIONS',
    'PAGE_LIKES', 'POST_ENGAGEMENT', 'QUALITY_CALL', 'REACH', 'LANDING_PAGE_VIEWS',
    'VISIT_INSTAGRAM_PROFILE', 'VALUE', 'THRUPLAY', 'DERIVED_EVENTS', 'APP_INSTALLS_AND_OFFSITE_CONVERSIONS',
    'CONVERSATIONS', 'IN_APP_VALUE', 'MESSAGING_PURCHASE_CONVERSION', 'SUBSCRIBERS',
    'REMINDERS_SET', 'MEANINGFUL_CALL_ATTEMPT', 'PROFILE_VISIT', 'PROFILE_AND_PAGE_ENGAGEMENT',
    'MESSAGING_APPOINTMENT_CONVERSION'
  ];

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const token = sessionStorage.getItem('access_token');  // Get the token
    
        if (!token) {
          // If there's no token, redirect to login
          setError('Unauthorized. Please log in.');
          navigate('/login');
          return;
        }
        const response = await axios.get('http://localhost:5000/api/campaigns', {
          headers: {
            'Authorization': `Bearer ${token}`  // Attach the token
          }
        });

        if (response.data && response.data.length === 0) {
          setNoCampaigns(true); // Set state to indicate no campaigns
        } else {
          setCampaigns(response.data || []);
          setNoCampaigns(false); // Reset the state if campaigns are available
        }

        setLoading(false);
      } catch (error) {
        setLoading(false);
        if (error.response && error.response.status === 401) {
          setError('Unauthorized. Please log in.');
          navigate('/login');
        } else {
          setError('Error fetching campaigns. Please try again later.');
        }
      }
    };

    fetchCampaigns();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdGroupData({
      ...adGroupData,
      [name]: value,
    });
  };

  const countryCodeMapping = {
    'United States': 'US', 'Canada': 'CA', 'United Kingdom': 'GB', 'Australia': 'AU',
    'Germany': 'DE', 'France': 'FR',
  };

  const handleCountryChange = (e) => {
    const selectedCountries = Array.from(e.target.selectedOptions, (option) => option.value);
    const countryCodes = selectedCountries.map((country) => countryCodeMapping[country]);

    setAdGroupData({
      ...adGroupData,
      countries: selectedCountries,
      targeting: {
        geo_locations: { countries: countryCodes }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (adGroupData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' && !adGroupData.bid_amount) {
      alert('Bid amount is required for the LOWEST_COST_WITH_BID_CAP strategy.');
      return;
    }

    if (adGroupData.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS' && (!adGroupData.roas_average_floor || !adGroupData.optimization_goal)) {
      alert('ROAS average floor and optimization goal are required for the LOWEST_COST_WITH_MIN_ROAS strategy.');
      return;
    }

    try {
      const token = sessionStorage.getItem('access_token');  // Get the token
    
      if (!token) {
        // If there's no token, redirect to login
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }
      const response = await axios.post('http://localhost:5000/api/ad-groups', adGroupData, {
        headers: {
          'Authorization': `Bearer ${token}`  // Attach the token
        }
      });

      if (response.status === 201) {
        setShowModal(true);
      } else {
        alert('Error: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error creating ad group:', error);
      alert(error.response.data.error);
    }
  };

  if (loading) {
    return <Spinner />;  // Show the Spinner component when loading
  }

  const handleCloseModal = () => {
    setShowModal(false);  // Close the modal
  };
  
  const handleNavigateToDashboard = () => {
    setShowModal(false);  // Close the modal
    navigate('/dashboard');  // Navigate to dashboard
  };


  

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Create Ad Set</h1>
      {noCampaigns && <div className="text-red-500 mb-4">No campaigns found. Please create a campaign first.</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Campaign</label>
          <select
            name="campaign_id"
            value={adGroupData.campaign_id}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select Campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Ad Set Name</label>
          <input
            type="text"
            name="name"
            value={adGroupData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Daily Budget</label>
          <input
            type="number"
            name="daily_budget"
            value={adGroupData.daily_budget}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Target Countries</label>
          <select
            multiple
            value={adGroupData.countries}
            onChange={handleCountryChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            {availableCountries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Billing Event</label>
          <select
            name="billing_event"
            value={adGroupData.billing_event}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select Billing Event</option>
            <option value="IMPRESSIONS">IMPRESSIONS</option>
            <option value="LINK_CLICKS">LINK_CLICKS</option>
            <option value="PAGE_LIKES">PAGE_LIKES</option>
            <option value="POST_ENGAGEMENT">POST_ENGAGEMENT</option>
            <option value="VIDEO_VIEWS">VIDEO_VIEWS</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Bid Strategy</label>
          <select
            name="bid_strategy"
            value={adGroupData.bid_strategy}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select Bid Strategy</option>
            <option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost Without Cap</option>
            <option value="COST_CAP">Cost Cap</option>
            <option value="LOWEST_COST_WITH_MIN_ROAS">Lowest Cost With Min ROAS</option>
            <option value="LOWEST_COST_WITH_BID_CAP">Lowest Cost With Bid Cap</option>
          </select>
        </div>

        {adGroupData.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">ROAS Average Floor</label>
            <input
              type="number"
              name="roas_average_floor"
              value={adGroupData.roas_average_floor}
              onChange={handleInputChange}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Optimization Goal</label>
          <select
            name="optimization_goal"
            value={adGroupData.optimization_goal}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select Optimization Goal</option>
            {validOptimizationGoals.map((goal) => (
              <option key={goal} value={goal}>
                {goal}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Bid Amount</label>
          <input
            type="number"
            name="bid_amount"
            value={adGroupData.bid_amount}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required={adGroupData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP'}
          />
        </div>


        <div className="mb-4">
        <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded-md">
          Create Ad Set
        </button>
        </div>

        
          <button
            type="button"  // Prevent form submission
            onClick={() => navigate('/dashboard')}  // Redirect to dashboard
            className="w-full bg-gray-500 text-white py-2 px-4 rounded-md"
          >
            Back to Dashboard
          </button>
        

          {showModal && (
        <Modal
          message="Ad Set Created Successfully!"
          onClose={handleCloseModal}
          onNavigate={handleNavigateToDashboard} // Pass the navigate function
        />
      )}
      </form>
    </div>
  );
};

export default CreateAdGroupComponent;
