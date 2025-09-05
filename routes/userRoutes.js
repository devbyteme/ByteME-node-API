const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserPreferences,
  updateUserPreferences
} = require('../controllers/userController');

// User management routes (authentication handled separately)
router.get('/', getAllUsers);

// User preferences routes (must come before :id routes)
router.get('/:id/preferences', getUserPreferences);
router.put('/:id/preferences', updateUserPreferences);

// General user routes
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router; 