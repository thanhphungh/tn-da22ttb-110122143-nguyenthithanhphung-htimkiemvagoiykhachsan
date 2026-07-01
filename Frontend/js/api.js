
const API_BASE = 'http://localhost:3000/api';


function getToken() {
  return localStorage.getItem('token');
}

async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();

  const finalHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (token) {
    finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data && data.message ? data.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

const api = {
  async login({ email, password }) {
    return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
  },

  async register({ full_name, email, password, phone }) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: { full_name, email, password, phone }
    });
  },

  async searchHotels({ keyword, minPrice, maxPrice, minRating, limit } = {}) {
    const params = new URLSearchParams();
    if (keyword) params.set('keyword', keyword);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    if (limit) params.set('limit', limit);

    return apiRequest(`/hotels/search?${params.toString()}`);
  },

  async getHotel(id) {
    return apiRequest(`/hotels/${id}`);
  },

  async createBooking({ hotel_id, check_in, check_out, total_price, total_rooms }) {
    return apiRequest('/bookings', {
      method: 'POST',
      body: { hotel_id, check_in, check_out, total_price, total_rooms }
    });
  },

  async recommendHotels({ lat, lng, limit } = {}) {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', lat);
    if (lng !== undefined) params.set('lng', lng);
    if (limit) params.set('limit', limit);

    return apiRequest(`/recommendations?${params.toString()}`);
  },

  async chat({ message }) {
    return apiRequest('/chatbot', { method: 'POST', body: { message } });
  },

  async hotelsNear({ lat, lng, limit } = {}) {
    const params = new URLSearchParams();
    if (lat !== undefined) params.set('lat', lat);
    if (lng !== undefined) params.set('lng', lng);
    if (limit) params.set('limit', limit);

    return apiRequest(`/map/hotels-near?${params.toString()}`);
  }
};

export default api;

