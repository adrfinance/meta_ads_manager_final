import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';  // Import the Modal component

// Spinner Component
const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const CreateAdCreativePage = () => {
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    message: '',
    image: '',
    ctaType: '',
    caption: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showModal, setShowModal] = useState(false);  // State to control modal visibility
  const [modalMessage, setModalMessage] = useState(''); // State to store modal message
  const navigate = useNavigate();

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
    setSuccessMessage('');  // Reset any previous success message
    setShowModal(false);
  
    // Check if all fields are filled in
    if (!formData.name || !formData.message || !formData.link || !formData.image || !formData.caption || !formData.ctaType) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
  
    const adCreativePayload = {
      name: formData.name,
      link: formData.link,
      message: formData.message,
      image: formData.image,
      cta_type: formData.ctaType,
      caption: formData.caption,
    };
  
    try {
      const token = sessionStorage.getItem('access_token');
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        return;
      }
  
      const response = await axios.post('http://localhost:5000/api/ad-creatives', adCreativePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      if (response.status === 200) {
        setModalMessage('Ad creative created successfully!');
        setShowModal(true);  // Show the modal on success
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating Ad Creative');
    } finally {
      setLoading(false);
    }
  };
  
  const handleNavigateToDashboard = () => {
    navigate('/dashboard');  // Navigate to the dashboard when the button is clicked
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Create a New Ad Creative</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-6 p-4 bg-blue-100 text-blue-700 border-l-4 border-blue-500">
        <strong>Note:</strong> The URL, Picture, and Caption fields should contain a URL of an image that can be downloaded, e.g. https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Name</label>
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
          <label className="block text-sm font-medium text-gray-700">URL</label>
          <input
            type="text"
            name="link"
            value={formData.link}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <input
            type="text"
            name="message"
            value={formData.message}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Picture</label>
          <input
            type="text"
            name="image"
            value={formData.image}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Caption</label>
          <input
            type="text"
            name="caption"
            value={formData.caption}
            onChange={handleInputChange}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Call to Action</label>
          <select
            name="ctaType"
            value={formData.ctaType}
            onChange={handleInputChange}
            className={`w-full px-4 py-2 mt-2 border ${formData.ctaType === '' && error ? 'border-red-500' : 'border-gray-300'} rounded-md`}
          >
            <option value="">Select Call to Action</option>
            <option value="SHOP_NOW">SHOP_NOW</option>
            <option value="LEARN_MORE">LEARN_MORE</option>
            <option value="SIGN_UP">SIGN_UP</option>
          </select>
        </div>

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
            'Create Creative'
          )}
        </button>

        <button
          type="button"
          onClick={handleNavigateToDashboard}
          className="mt-4 w-full py-2 px-4 rounded bg-gray-500 text-white hover:bg-gray-600"
        >
          Back to Dashboard
        </button>
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

export default CreateAdCreativePage;
