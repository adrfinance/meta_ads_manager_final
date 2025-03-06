import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const CreateCampaignPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    status: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [modalVisible, setModalVisible] = useState(false); // State for modal visibility
  const navigate = useNavigate();

  useEffect(() => {
    const fetchObjectives = async () => {
      setObjectives([
        { value: 'OUTCOME_TRAFFIC', label: 'Traffic' },
        { value: 'OUTCOME_SALES', label: 'Sales' },
        { value: 'OUTCOME_LEADS', label: 'Leads' },
        { value: 'OUTCOME_ENGAGEMENT', label: 'Engagement' },
        { value: 'OUTCOME_AWARENESS', label: 'Awareness' },
        { value: 'OUTCOME_APP_PROMOTION', label: 'App Promotion' },
      ]);
    };
    fetchObjectives();
  }, []);

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

    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }

      if (!formData.objective) {
        setError('Objective is required.');
        return;
      }

      if (!formData.status) {
        setError('Status is required.');
        return;
      }

      // Send request to create the campaign
      await axios.post('http://localhost:5000/api/campaigns', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Show modal notification
      setModalVisible(true);
    } catch (error) {
      setError('Error creating campaign.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    navigate('/dashboard'); // Navigate to the dashboard after closing the modal
  };

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Create Campaign</h1>

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
            <option value="">Select Objective</option>
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
            <option value="">Select Status</option>
            <option value="PAUSED">Paused</option>
            <option value="ACTIVE">Active</option>
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
              'Create Campaign'
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

      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
            <h2 className="text-xl font-bold mb-4">Campaign Created Successfully!</h2>
            <button
              onClick={handleCloseModal}
              className="w-full py-2 px-4 rounded bg-blue-500 text-white hover:bg-blue-600"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaignPage;
