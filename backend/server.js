require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.static(path.join(__dirname, '../Frontend')));

const { activityMiddleware } = require('./middleware/activityLogger');
app.use(activityMiddleware);

app.use('/api/auth',            require('./routes/auth'));
app.use('/api/hotels',          require('./routes/hotels'));
app.use('/api/bookings',        require('./routes/bookings'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/map',             require('./routes/map'));
app.use('/api/favorites',       require('./routes/favorites'));
app.use('/api/ratings',         require('./routes/ratings'));
app.use('/api/profile',         require('./routes/profile'));
app.use('/api/admin',           require('./routes/admin'));
app.use('/api/notifications',   require('./routes/notifications'));
app.use('/api/owner',           require('./routes/owner'));

app.get('/api/ping', (req, res) => res.json({ ok: true, message: 'Server running' }));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
