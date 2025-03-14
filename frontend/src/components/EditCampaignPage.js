import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from './Modal'; // Import the modal component

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const EditCampaignPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    status: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [objectives, setObjectives] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false); // Modal visibility state

  const navigate = useNavigate();
  const { campaignId } = useParams();

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('access_token');
        if (!token) {
          setError('Unauthorized. Please log in.');
          navigate('/login');
          return;
        }

        // Fetch campaign data
        const response = await axios.get(`http://localhost:5000/api/campaigns/${campaignId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const campaign = response.data;
        setFormData({
          name: campaign.name || '',
          objective: campaign.objective || '',
          status: campaign.status || '',
        });

        // Fetch objectives
        setObjectives([
          { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
          { value: 'OUTCOME_SALES', label: 'Sales' },
          { value: 'OUTCOME_LEADS', label: 'Leads' },
          { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
          { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
          { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
        ]);
      } catch (error) {
        setError('Error fetching campaign data.');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }

      await axios.put(`http://localhost:5000/api/campaigns/${campaignId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Show modal on success
      setModalVisible(true);
    } catch (error) {
      setError('Error updating campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Edit Campaign</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Campaign Name</label>
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
          <label className="block text-sm font-medium text-gray-700">Objective</label>
          <select
            name="objective"
            value={formData.objective}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            {objectives.map((obj) => (
              <option key={obj.value} value={obj.value}>
                {obj.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          >
            <option value="PAUSED">Paused</option>
            <option value="ACTIVE">Active</option>
          </select>
        </div>

        <div className="flex flex-col space-y-4">
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded ${submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            disabled={submitting}
          >
            {submitting ? (
              <div className="flex items-center">
                <div className="border-4 border-white border-t-transparent rounded-full w-5 h-5 animate-spin mr-2"></div>
                Saving...
              </div>
            ) : (
              'Save Changes'
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

      {/* Modal Component */}
      {modalVisible && (
        <Modal
          message="Campaign updated successfully!"
          onClose={closeModal}
          onNavigate={handleBackToDashboard}
        />
      )}
    </div>
  );
};

export default EditCampaignPage;
