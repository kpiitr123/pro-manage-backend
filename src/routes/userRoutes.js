const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// Get all users (for task assignment)
router.get('/', auth, async (req, res) => {
  try {
    const users = await User.find({}, 'name email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// Search users by email or name
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }, 'name email');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error searching users' });
  }
});

module.exports = router;