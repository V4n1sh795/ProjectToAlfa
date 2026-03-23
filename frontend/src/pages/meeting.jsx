import React, { useState } from 'react';
import axios from 'axios';

function Meet() {
  const [formData, setFormData] = useState({
    date: '',
    time: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    // Комбинируем дату и время в один объект DateTime
    const dateTime = new Date(`${formData.date}T${formData.time}`);
    
    const meetingData = {
      Date: formData.date,
      Time: formData.time
    };
    
    try {
      const response = await axios.post('/api/meeting/', meetingData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('Meeting created:', response.data);
      setSuccess(true);
      
      // Очищаем форму
      setFormData({
        date: '',
        time: ''
      });
      
      // Скрываем сообщение через 3 секунды
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="meeting-form-container">
      <h2>Create New Meeting</h2>
      
      {success && (
        <div className="alert success">
          ✓ Meeting created successfully!
        </div>
      )}
      
      {error && (
        <div className="alert error">
          ✗ {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="date">Meeting Date *</label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="time">Meeting Time *</label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={loading} 
          className="submit-btn"
        >
          {loading ? 'Creating...' : 'Create Meeting'}
        </button>
      </form>
    </div>
  );
}

export default Meet;