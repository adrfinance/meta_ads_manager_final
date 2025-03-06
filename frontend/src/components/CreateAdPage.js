import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Spinner component
const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const CreateAdPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    adsetId: '',
    creativeId: '',
    status: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adSets, setAdSets] = useState([]);
  const [creatives, setCreatives] = useState([]);
  const [adSetsLoading, setAdSetsLoading] = useState(true);
  const [creativesLoading, setCreativesLoading] = useState(true);

  const navigate = useNavigate();
  const token = sessionStorage.getItem('access_token');

  useEffect(() => {
    const fetchAdSets = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/ad-sets', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAdSets(response.data || []);
      } catch (error) {
        if (error.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to fetch ad sets.');
        }
      } finally {
        setAdSetsLoading(false);
      }
    };

    const fetchCreatives = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/ad-creatives', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCreatives(response.data || []);
      } catch (error) {
        setError('Error fetching creatives.');
      } finally {
        setCreativesLoading(false);
      }
    };

    fetchAdSets();
    fetchCreatives();
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if all fields are filled, including the 'status' field
    if (!formData.name || !formData.adsetId || !formData.creativeId || !formData.status) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/create-ad', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 201) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Error creating ad.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Check for different conditions
  const showNoAdSetsAndNoCreativesError = adSets.length === 0 && creatives.length === 0;
  const showNoCreativesError = adSets.length > 0 && creatives.length === 0;
  const showNoAdSetsError = adSets.length === 0; 

  if (loading || adSetsLoading || creativesLoading) {
    return <Spinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Create Ad</h1>

      {showNoAdSetsAndNoCreativesError && (
        <div className="text-red-500 mb-4">
          No ad sets and ad creatives available. Please create at least one of each.
        </div>
      )}

      {showNoAdSetsError && !showNoAdSetsAndNoCreativesError && (
        <div className="text-red-500 mb-4">No ad sets available. Please create an ad set first.</div>
      )}

      {showNoCreativesError && !showNoAdSetsAndNoCreativesError && (
        <div className="text-red-500 mb-4">No ad creatives available. Please create at least one ad creative.</div>
      )}

      {error && !showNoAdSetsAndNoCreativesError && !showNoCreativesError && !showNoAdSetsError && (
        <div className="text-red-500 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Ad Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Ad Set</label>
          {adSetsLoading ? (
            <Spinner />
          ) : (
            <select
              name="adsetId"
              value={formData.adsetId}
              onChange={handleInputChange}
              className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Ad Set</option>
              {adSets.map((adSet) => (
                <option key={adSet.id} value={adSet.id}>
                  {adSet.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Creative</label>
          {creativesLoading ? (
            <Spinner />
          ) : (
            <select
              name="creativeId"
              value={formData.creativeId}
              onChange={handleInputChange}
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
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
          >
            <option value="">Select Status</option> {/* Placeholder option */}
            <option value="ACTIVE">ACTIVE</option>
            <option value="PAUSED">PAUSED</option>
          </select>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="border-4 border-white border-t-transparent rounded-full w-5 h-5 animate-spin mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Ad'
            )}
          </button>

          <button
            onClick={handleBackToDashboard}
            className="w-full py-2 px-4 rounded bg-gray-500 text-white hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAdPage;
