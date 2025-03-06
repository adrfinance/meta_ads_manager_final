import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Import useNavigate hook

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // Initialize the navigate function

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        email,
        password,
      });
      
      const { message, user, access_token } = response.data;
  
      console.log('Response Data:', message);
      console.log('User Data:', user);
  
      // Store the user_id and access_token in sessionStorage
      sessionStorage.setItem('user_id', user.id);
      sessionStorage.setItem('access_token', access_token);  // Store the access token
  
      // Redirect to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      setError('Invalid credentials');
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-blue-100">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-lg">
        <h1 className="text-4xl font-bold text-blue-600 mb-6">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          <div className="text-left">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button type="submit" className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition">
            Login
          </button>
        </form>

        <div className="mt-4">
          <p className="text-sm">
            Don't have an account?{' '}
            <a href="/register" className="text-blue-500 hover:text-blue-700">Register here</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
