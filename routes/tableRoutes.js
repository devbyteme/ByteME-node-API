const express = require('express');
const router = express.Router();
const { authenticateToken, requireVendor } = require('../middleware/auth');

// Import table controller
const tableController = require('../controllers/tableController');

// ==================== TABLE ROUTES ====================
// Public routes (no authentication required)
router.get('/tables', tableController.getAllTables);
router.get('/tables/:id', tableController.getTableById);
router.get('/tables/availability', tableController.getTableAvailability);

// Protected routes (vendor authentication required)
router.post('/tables', authenticateToken, requireVendor, tableController.createTable);
router.put('/tables/:id', authenticateToken, requireVendor, tableController.updateTable);
router.delete('/tables/:id', authenticateToken, requireVendor, tableController.deleteTable);
router.patch('/tables/:id/status', authenticateToken, requireVendor, tableController.updateTableStatus);

module.exports = router;
