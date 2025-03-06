import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from './Modal'; // Assuming Modal.js is in the same folder as EditAdGroupPage.js



const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const EditAdGroupPage = () => {
  const handleBackToDashboard = (e) => {
    e.preventDefault(); // Prevent form submission
    navigate('/dashboard'); // Redirect to the dashboard page
  };
  const { adGroupId } = useParams();
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
  const navigate = useNavigate();
  const [modalVisible, setModalVisible] = useState(false);


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
        const token = sessionStorage.getItem('access_token');
    
        if (!token) {
          setError('Unauthorized. Please log in.');
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/campaigns', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setCampaigns(response.data || []);
      } catch (error) {
        setError('Error fetching campaigns. Please try again later.');
      }
    };

    const fetchAdGroupDetails = async () => {
      try {
        const token = sessionStorage.getItem('access_token');
    
        if (!token) {
          setError('Unauthorized. Please log in.');
          navigate('/login');
          return;
        }

        const response = await axios.get(`http://localhost:5000/api/ad-groups/${adGroupId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setAdGroupData(response.data || {
          name: '',
          campaign_id: '',
          daily_budget: '',
          countries: [],
          billing_event: '',
          bid_strategy: '',
          bid_amount: '',
          roas_average_floor: '',
          optimization_goal: ''
        });
      } catch (error) {
        console.error('Error fetching ad group details:', error);
        setError('Error fetching ad group details.');
      }
    };

    fetchCampaigns();
    fetchAdGroupDetails();
    setLoading(false);
  }, [adGroupId, navigate]);

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
  
    // Validation for bid strategy
    if (adGroupData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' && !adGroupData.bid_amount) {
      alert('Bid amount is required for the LOWEST_COST_WITH_BID_CAP strategy.');
      return;
    }
  
    if (adGroupData.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS' && (!adGroupData.roas_average_floor || !adGroupData.optimization_goal)) {
      alert('ROAS average floor and optimization goal are required for the LOWEST_COST_WITH_MIN_ROAS strategy.');
      return;
    }
  
    try {
      const token = sessionStorage.getItem('access_token');
  
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }
  
      const response = await axios.put(
        `http://localhost:5000/api/ad-groups/${adGroupId}`,
        adGroupData,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
  
      // Check for successful response
      if (response.status === 200 || response.status === 201) {
        setModalVisible(true); // Show the modal on success
      } else {
        alert('Error: ' + (response.data?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error updating ad group:', error);
  
      // Ensure error response is available
      if (error.response) {
        alert('Error updating ad group: ' + (error.response.data?.error || 'An unknown error occurred.'));
      } else {
        alert('Error updating ad group: ' + (error.message || 'An unknown error occurred.'));
      }
    }
  };
  

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Edit Ad Set</h1>
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        {/* Campaign */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Campaign</label>
          <select
            name="campaign_id"
            value={adGroupData.campaign_id || ''}
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

        {/* Ad Group Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Ad Set Name</label>
          <input
            type="text"
            name="name"
            value={adGroupData.name || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Daily Budget */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Daily Budget</label>
          <input
            type="number"
            name="daily_budget"
            value={adGroupData.daily_budget || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Target Countries */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Target Countries</label>
          <select
            multiple
            value={adGroupData.countries || []}
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

        {/* Billing Event */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Billing Event</label>
          <select
            name="billing_event"
            value={adGroupData.billing_event || ''}
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

        {/* Bid Strategy */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Bid Strategy</label>
          <select
            name="bid_strategy"
            value={adGroupData.bid_strategy || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">Select Bid Strategy</option>
            <option value="LOWEST_COST_WITHOUT_CAP">Lowest Cost Without Cap</option>
            <option value="COST_CAP">Cost Cap</option>
            <option value="BID_CAP">Bid Cap</option>
            <option value="LOWEST_COST_WITH_BID_CAP">Lowest Cost With Bid Cap</option>
            <option value="LOWEST_COST_WITH_MIN_ROAS">Lowest Cost With Minimum ROAS</option>
          </select>
        </div>


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


        {/* Bid Amount */}
        {adGroupData.bid_strategy === 'LOWEST_COST_WITH_BID_CAP' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Bid Amount</label>
            <input
              type="number"
              name="bid_amount"
              value={adGroupData.bid_amount || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            />
          </div>
        )}

        {/* ROAS */}
        {adGroupData.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">ROAS Average Floor</label>
            <input
              type="number"
              name="roas_average_floor"
              value={adGroupData.roas_average_floor || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            />
          </div>
        )}

        {/* Optimization Goal */}
        {adGroupData.bid_strategy === 'LOWEST_COST_WITH_MIN_ROAS' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Optimization Goal</label>
            <select
              name="optimization_goal"
              value={adGroupData.optimization_goal || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            >
              <option value="">Select Optimization Goal</option>
              {validOptimizationGoals.map((goal) => (
                <option key={goal} value={goal}>
                  {goal}
                </option>
              ))}
            </select>
          </div>
        )}

<button
  type="submit"
  className="w-full py-2 px-4 mt-4 bg-blue-500 text-white font-semibold rounded-md"
>
  Save Changes
</button>

<button
  onClick={handleBackToDashboard} // Attach event handler to prevent form submission
  className="w-full py-2 px-4 mt-4 bg-gray-500 text-white font-semibold rounded-md"
>
  Back to Dashboard
</button>
      </form>
      {modalVisible && (
      <Modal
        message="Ad Set Updated Successfully!"
        onClose={() => setModalVisible(false)} // Close the modal
        onNavigate={() => navigate('/dashboard')} // Navigate to the dashboard
      />
    )}      
    </div>
  );
};

export default EditAdGroupPage;
