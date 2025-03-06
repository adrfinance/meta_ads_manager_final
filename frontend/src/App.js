import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import CreateCampaignPage from './components/CreateCampaignPage';
import DashboardPage from './components/DashboardPage';
import EditCampaignPage from './components/EditCampaignPage';
import CreateAdGroupPage from './components/CreateAdGroupPage'; // Import the CreateAdGroupPage
import EditAdGroupPage from './components/EditAdGroupPage'; // Import EditAdGroupPage
import CreateAdPage from './components/CreateAdPage'; // Import CreateAdPage
import CreateAdCreativePage from './components/CreateAdCreativePage'; // Import CreateAdPage
import EditAdPage from './components/EditAdPage'; // Import CreateAdPage
import EditAdCreativePage from './components/EditAdCreativePage';


// Main homepage with login and register links
const App = () => {
  return (
    <div className="flex justify-center items-center h-screen bg-blue-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-lg">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">
          Welcome to the Meta Ads Manager
        </h1>
        <p className="text-gray-700 mb-4">Manage your campaigns with ease.</p>

        {/* Navigation Buttons */}
        <div className="space-y-4">
          <Link to="/login" className="w-full block bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition text-center">
            Login
          </Link>
          <Link to="/register" className="w-full block bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition text-center">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
};

// PrivateRoute to protect routes
const PrivateRoute = ({ children }) => {
  const userId = sessionStorage.getItem('user_id'); // Get user_id from session storage

  // If no user_id, redirect to login
  return userId ? children : <Navigate to="/login" replace />;
};

const AppWrapper = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<App />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <DashboardPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/create-campaign" 
          element={
            <PrivateRoute>
              <CreateCampaignPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/create-ad-group" 
          element={
            <PrivateRoute>
              <CreateAdGroupPage />
            </PrivateRoute>
          }
        />
        <Route 
          path="/edit-ad-group/:adGroupId" 
          element={
            <PrivateRoute>
              <EditAdGroupPage />
            </PrivateRoute>
          }
        />
        <Route 
          path="/edit-campaign/:campaignId" 
          element={
            <PrivateRoute>
              <EditCampaignPage />
            </PrivateRoute>
          } 
        />
          <Route 
          path="/edit-ad/:adId" 
          element={
            <PrivateRoute>
              <EditAdPage />
            </PrivateRoute>
          } 
        />
        <Route path="/create-ad" element={<CreateAdPage />} />
        <Route path="/create-ad-creative" element={<CreateAdCreativePage />} />
        <Route path="/edit-ad-creative/:id" element={<EditAdCreativePage />} />

      </Routes>
    </Router>
  );
};

export default AppWrapper;
