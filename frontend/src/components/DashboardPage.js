import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";



const ConfirmDeleteModal = ({ isOpen, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  // Replace the '\n\n' with <br /> tags
  const formattedMessage = message.replace(/\n\n/g, "<br /><br />");

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
        <p
          dangerouslySetInnerHTML={{
            __html: formattedMessage,
          }}
        />
        <div className="mt-4 flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};






const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [adGroups, setAdGroups] = useState([]);
  const [adCreatives, setAdCreatives] = useState([]);
  const [ads, setAds] = useState([]);
  const [error, setError] = useState(null);

  const [deletingItem, setDeletingItem] = useState(null);
  const [modalMessage, setModalMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const navigate = useNavigate();
  const token = sessionStorage.getItem("access_token");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        navigate("/login");
        return;
      }
  
      try {
        const [campaignRes, adGroupRes, creativeRes, adRes] = await Promise.all([
          axios.get("http://localhost:5000/api/campaigns", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/ad-groups", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/ad-creatives", { headers: { Authorization: `Bearer ${token}` } }),
          axios.get("http://localhost:5000/api/ads", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
  
        setCampaigns(campaignRes.data || []);
        setAdGroups(adGroupRes.data || []);
        setAdCreatives(creativeRes.data || []);
        setAds(adRes.data || []);
      } catch (error) {
        if (error.response && error.response.status === 401) {
          // Token is invalid or expired, redirect to login
          sessionStorage.removeItem("access_token");
          navigate("/login");
        } else {
          setError("Failed to fetch data.");
          console.error(error);
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [token, navigate]);
  

  // Lookup tables
  const campaignLookup = Object.fromEntries(campaigns.map(c => [c.id, c.name]));
  const adGroupLookup = Object.fromEntries(adGroups.map(ag => [ag.id, ag.name]));

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    navigate("/login");
  };

  const handleDelete = async (endpoint, id, setState, name) => {
    let message = `Are you sure you want to delete the ad: "${name}"?`;
    
    if (endpoint === "campaigns") {
      message = `⚠️ Warning: Deleting this campaign will also delete all associated ad sets and ads.\n\nAre you sure you want to delete the campaign: "${name}"?`;
    }
    
    if (endpoint === "ad-groups") {
      message = `⚠️ Warning: Deleting this ad set will also delete all associated ads.\n\nAre you sure you want to delete the ad set: "${name}"?`;
    }
  
    if (endpoint === "ad-creatives") {
      message = `Are you sure you want to delete the ad creative: "${name}"?`;
    }
  
    setModalMessage(message);
    setDeletingItem({ endpoint, id, setState, name });
    setIsModalOpen(true);
  };
  
  
  const cancelDelete = () => {
    setIsModalOpen(false);
  };
  



  const confirmDelete = async () => {
    const { endpoint, id, setState } = deletingItem;
  
    try {
      const deleteUrl =
        endpoint === "ads"
          ? `http://localhost:5000/api/delete-ad/${id}`
          : `http://localhost:5000/api/${endpoint}/${id}`;
  
      // If deleting an ad creative, we need to delete all associated ads first
      if (endpoint === "ad-creatives") {
        // Find all ads that are using this ad creative
        const relatedAdIds = ads.filter((ad) => ad.ad_creative_id === id).map((ad) => ad.id);
  
        // Delete all associated ads first
        for (const adId of relatedAdIds) {
          await axios.delete(`http://localhost:5000/api/ads/${adId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
  
        // Now delete the ad creative itself from the Meta API and the DB
        const deleteResponse = await axios.delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        // Only proceed if both the Meta API and the DB deletion were successful
        if (deleteResponse.status === 200) {
          // Remove the ad creative and associated ads from state
          setAds((prev) => prev.filter((ad) => !relatedAdIds.includes(ad.id)));
          setState((prev) => prev.filter((item) => item.id !== id)); // Remove ad creative from the list
        } else {
          throw new Error("Failed to delete from the Meta API or database.");
        }
      } else {
        // Deleting other items like campaigns or ad groups from the Meta API and DB
        const deleteResponse = await axios.delete(deleteUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        if (deleteResponse.status === 200) {
          // Update the state to remove the item from the list after successful deletion
          setState((prev) => prev.filter((item) => item.id !== id));
  
          if (endpoint === "campaigns") {
            const relatedAdGroupIds = adGroups.filter((ag) => ag.campaign_id === id).map((ag) => ag.id);
            setAdGroups((prev) => prev.filter((ag) => ag.campaign_id !== id));
            setAds((prev) => prev.filter((ad) => !relatedAdGroupIds.includes(ad.ad_group_id)));
          }
  
          if (endpoint === "ad-groups") {
            const relatedAdIds = ads.filter((ad) => ad.ad_group_id === id).map((ad) => ad.id);
            setAds((prev) => prev.filter((ad) => !relatedAdIds.includes(ad.id)));
          }
        } else {
          throw new Error("Failed to delete from the Meta API or database.");
        }
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      alert(error.response ? error.response.data.error : error.message);
    }
  
    setIsModalOpen(false);
  };
  
  
  

  
  
  

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
          Logout
        </button>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="grid grid-cols-4 gap-4 overflow-x-auto">
        {[
          { title: "Campaigns", data: campaigns, endpoint: "campaigns", createPath: "/create-campaign", setState: setCampaigns },
          { title: "Ad Sets", data: adGroups, endpoint: "ad-groups", createPath: "/create-ad-group", setState: setAdGroups },
          { title: "Ad Creatives", data: adCreatives, endpoint: "ad-creatives", createPath: "/create-ad-creative", setState: setAdCreatives },
          { title: "Ads", data: ads, endpoint: "ads", createPath: "/create-ad", setState: setAds },
        ].map(({ title, data, endpoint, createPath, setState }) => (
          <section key={title} className="bg-white shadow-md rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">{title}</h2>
            <button onClick={() => navigate(createPath)} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 mb-4 w-full">
              Create New {title.slice(0, -1)}
            </button>
            {loading ? (
              <p>Loading...</p>
            ) : data.length === 0 ? (
              <p>No {title.toLowerCase()} available.</p>
            ) : (
              <ul className="space-y-2">
                {data.map((item) => (
  <li key={item.id} className="flex justify-between items-center bg-gray-100 p-2 rounded">
    <div>
      <span className="font-medium">{item.name}</span>
      {item.campaign_id && (
        <p className="text-sm text-gray-600">Campaign: {campaignLookup[item.campaign_id] || "Unknown"}</p>
      )}
      {item.ad_group_id && (
        <p className="text-sm text-gray-600">Ad Set: {adGroupLookup[item.ad_group_id] || "Unknown"}</p>
      )}
    </div>
    <div className="flex space-x-2">
      <button 
        onClick={() => navigate(endpoint === "campaigns" ? `/edit-campaign/${item.id}` : `/edit-${endpoint.slice(0, -1)}/${item.id}`)}
        className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
      >
        Edit
      </button>
      <button 
        onClick={() => handleDelete(endpoint, item.id, setState, item.name)} 
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete
      </button>
    </div>
  </li>
))}

              </ul>
            )}
          </section>
        ))}
      </div>
      <ConfirmDeleteModal
        isOpen={isModalOpen}
        message={modalMessage}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default DashboardPage;
