import { useState } from "react";
import axios from 'axios';

function Post() {
  const [formData, setFormData] = useState({ name: ''});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('api/team/', formData);
      console.log('Успех:', response.data);
      setFormData({ name: ''});
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Имя"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Отправка...' : 'Отправить'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
export default Post;