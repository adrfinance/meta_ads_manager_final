import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from './Modal'; // Import the Modal component


// Spinner component
const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const EditAdPage = () => {
  const { adId } = useParams();  // Get the adId from the URL
  const [name, setName] = useState('');
  const [adsetId, setAdsetId] = useState('');
  const [creativeId, setCreativeId] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [adSets, setAdSets] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adSetsLoading, setAdSetsLoading] = useState(true);
  const [creativesLoading, setCreativesLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fetching, setFetching] = useState(true); // ✅ FIXED: Added fetching state
  const [showModal, setShowModal] = useState(false);  // State to control modal visibility
  const [modalMessage, setModalMessage] = useState(''); // State to store modal message

  const navigate = useNavigate();

  // Get the token from session storage
  const token = sessionStorage.getItem('access_token'); 

  // Use Effect to fetch ad data, creatives, and ad sets
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }

      try {
        // Fetch Ad Data
        const adResponse = await axios.get(`http://localhost:5000/api/ad/${adId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Ad Get:', adResponse.data);

        const adData = adResponse.data;
        setName(adData.name || '');
        setAdsetId(adData.ad_group_id || ''); // Set initial ad set ID (using ad_group_id)
        setCreativeId(adData.meta_creative_id || ''); // Set initial creative ID
        setStatus(adData.status || 'ACTIVE');

        // Fetch Ad Sets
        const adSetsResponse = await axios.get('http://localhost:5000/api/ad-sets', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Ad Sets Response:', adSetsResponse.data);
        const adSetsData = adSetsResponse.data || [];
        setAdSets(adSetsData);
        setAdSetsLoading(false);

        // Find the ad set name corresponding to the ad_group_id
        const matchedAdSet = adSetsData.find(adSet => adSet.id === adData.ad_group_id);
        if (matchedAdSet) {
          setAdsetId(matchedAdSet.id); // Set the matched ad set ID if available
        }

        // Fetch Creatives
        const creativesResponse = await axios.get('http://localhost:5000/api/ad-creatives', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log('Creatives Response:', creativesResponse.data);
        setCreatives(creativesResponse.data || []);
        setCreativesLoading(false);

      } catch (error) {
        setError('Error fetching data.');
        console.error(error);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [adId, token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!name || !adsetId || !creativeId) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    const adPayload = {
      name,
      ad_group_id: adsetId,  // Use ad_group_id for updating the ad
      meta_creative_id: creativeId,
      status,
    };

    try {
      const response = await axios.post(`http://localhost:5000/api/edit-ad/${adId}`, adPayload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        setModalMessage('Ad updated successfully!');
        setShowModal(true);  // Show the modal on success
      }
    } catch (err) {
      setError('Error updating Ad');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToDashboard = () => {
    navigate('/dashboard');  // Navigate to the dashboard when the button is clicked
  };

  // Only show the form after all data is fetched
  if (fetching || adSetsLoading || creativesLoading) {
    return <Spinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Edit Ad</h1>

      {successMessage && <div className="text-green-500 mb-4">{successMessage}</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Ad Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="adsetId" className="block text-sm font-medium text-gray-700">Ad Set</label>
          {adSetsLoading ? (
            <div className="flex justify-center items-center mt-2">
              <Spinner />
            </div>
          ) : adSets.length === 0 ? (
            <p className="text-red-500">No ad sets found. Create one first.</p>
          ) : (
            <select
              id="adsetId"
              value={adsetId}
              onChange={(e) => setAdsetId(e.target.value)}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Ad Set</option>
              {adSets.map((adSet) => (
                <option key={adSet.id} value={adSet.id}>{adSet.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="creativeId" className="block text-sm font-medium text-gray-700">Creative</label>
          {creativesLoading ? (
            <div className="flex justify-center items-center mt-2">
              <Spinner />
            </div>
          ) : (
            <select
              id="creativeId"
              value={creativeId}
              onChange={(e) => setCreativeId(e.target.value)}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Creative</option>
              {creatives.map((creative) => (
                <option key={creative.creative_id} value={creative.creative_id}>
                  {creative.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
          </select>
        </div>

        <button
          type="submit"
          className={`w-full py-2 px-4 rounded ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          disabled={loading}
        >
          {loading ? 'Updating Ad...' : 'Update Ad'}
        </button>

        <div className="mt-4">
    <button
      onClick={handleNavigateToDashboard}
      className="w-full py-2 px-4 rounded bg-gray-500 text-white hover:bg-gray-600"
    >
      Back to Dashboard
    </button>
  </div>

      </form>

      {showModal && (
        <Modal
          message={modalMessage}
          onClose={() => setShowModal(false)} 
          onNavigate={handleNavigateToDashboard}  // Pass the navigate function to Modal
        />
      )}

    </div>
  );
};

export default EditAdPage;
