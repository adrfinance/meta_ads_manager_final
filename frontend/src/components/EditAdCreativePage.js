import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from './Modal'; // Assuming Modal.js is in the same folder as EditAdGroupPage.js

// Spinner Component
const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
  </div>
);

const EditAdCreativePage = () => {
  const { id } = useParams();  // Extract the id from the URL
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/dashboard'); // Redirect to the dashboard page
  };

  // State variables
  const [name, setName] = useState('');
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');
  const [image, setImage] = useState('');
  const [ctaType, setCtaType] = useState('SHOP_NOW');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchAdCreative = async () => {
      setLoading(true);
      const token = sessionStorage.getItem('access_token'); // Get the token

      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login'); // Redirect to login if no token is found
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:5000/api/ad-creatives/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`  // Attach the token
          }
        });

        const data = response.data;
        setName(data.name);
        setLink(data.link);
        setMessage(data.message);
        setImage(data.image);
        setCtaType(data.cta_type);
        setCaption(data.caption);  // This line ensures the caption gets populated
      } catch (err) {
        if (err.response?.status === 401) {
          setError('Unauthorized. Please log in.');
          navigate('/login'); // Redirect if unauthorized (401)
        } else {
          setError(err.response?.data?.error || 'Error fetching Ad Creative');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAdCreative();
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
  
    // Simple validation
    if (!name || !message || !link || !image || !caption) {
      setError('All fields are required');
      setLoading(false);
      return;
    }
  
    const token = sessionStorage.getItem('access_token');
  
    const adCreativePayload = {
      name,
      link,
      message,
      image,
      cta_type: ctaType,
      caption
    };
  
    try {
      if (!token) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
        setLoading(false);
        return;
      }
  
      const response = await axios.put(`http://localhost:5000/api/ad-creatives/${id}`, adCreativePayload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
  
      if (response.status === 200) {
        setModalVisible(true); // Show the modal on success
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Unauthorized. Please log in.');
        navigate('/login');
      } else {
        setError(err.response?.data?.error || 'Error updating Ad Creative');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Spinner />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-4">Edit Ad Creative</h1>

      {/* Note about image URL */}
      <div className="text-sm text-gray-600 mb-4">
        <strong>Note:</strong> 'Link', 'Picture', and 'Caption' should point to the full URL of an image accessible via the internet (e.g., https://upload.wikimedia.org/wikipedia/en/a/a9/Example.jpg).
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg">
        {/* Input fields */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Name</label>
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
          <label className="block text-sm font-medium text-gray-700">Link</label>
          <input
            type="text"
            id="link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Message</label>
          <input
            type="text"
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Picture</label>
          <input
            type="text"
            id="image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Caption</label>
          <input
            type="text"
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Call to Action</label>
          <select
            id="ctaType"
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value)}
            className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md"
          >
            <option value="SHOP_NOW">SHOP_NOW</option>
            <option value="LEARN_MORE">LEARN_MORE</option>
            <option value="SIGN_UP">SIGN_UP</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex flex-col space-y-4 mt-4">


          <button
            type="submit"
            className={`w-full py-2 px-4 rounded ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center">
                <div className="border-4 border-white border-t-transparent rounded-full w-5 h-5 animate-spin mr-2"></div>
                Updating...
              </div>
            ) : (
              'Update Creative'
            )}
          </button>
          <button
            type="button"
            onClick={handleBackToDashboard}
            className="w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-md"
          >
            Back to Dashboard
          </button>
        </div>
      </form>

      {/* Modal for success message */}
{modalVisible && (
  <Modal 
    message="Ad Creative Updated Successfully!" 
    onClose={() => setModalVisible(false)} 
    onNavigate={handleBackToDashboard} // Navigate to dashboard after clicking the button
  />
)}

    </div>
  );
};

export default EditAdCreativePage;
