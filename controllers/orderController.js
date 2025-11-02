const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail, sendOrderReadyEmail } = require('../services/emailService');

// Non-blocking email helper function
const sendEmailAsync = async (emailFunction, ...args) => {
  setImmediate(async () => {
    try {
      await emailFunction(...args);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Email sending failed (non-blocking):', error.message);
      // Don't throw error - just log it
    }
  });
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Public (optional authentication)
const createOrder = async (req, res) => {
  try {
    const {
      tableNumber,
      items,
      notes,
      customerId,
      paymentMethod,
      tipAmount,
      tipPercentage,
      dietaryRequirements,
      specialRequests,
      customerPhone,
      customer_email
    } = req.body;

    // Validate required fields
    if (!tableNumber || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Table number and items are required'
      });
    }

    // Validate items and calculate total
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item with ID ${item.menuItemId} not found`
        });
      }

      if (!menuItem.available) {
        return res.status(400).json({
          success: false,
          message: `Menu item ${menuItem.name} is not available`
        });
      }

      const itemTotal = menuItem.price * item.quantity;
      totalAmount += itemTotal;

      validatedItems.push({
        menuItemId: item.menuItemId,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        notes: item.notes || ''
      });
    }

    // Get vendor ID from the first menu item
    const firstMenuItem = await MenuItem.findById(items[0].menuItemId);
    const vendorId = firstMenuItem.vendorId;

    // Create order
    const order = new Order({
      tableNumber,
      customerId: customerId || null,
      vendorId,
      items: validatedItems,
      totalAmount, // This will be recalculated in the pre-save hook to include tip
      paymentMethod: paymentMethod || 'cash',
      tipAmount: tipAmount || 0,
      tipPercentage: tipPercentage || 0,
      dietaryRequirements: dietaryRequirements || [],
      specialRequests: specialRequests || '',
      customerPhone: customerPhone || '',
      customerEmail: customer_email || '',
      notes: notes || '',
      status: 'pending',
      paymentStatus: 'pending'
    });

    await order.save();

    // Populate vendor info
    await order.populate('vendorId', 'name');

    // Send email notifications (async, don't wait for completion)
    setImmediate(async () => {
      try {
        // Get vendor details for email
        const vendor = await Vendor.findById(vendorId).select('name email');
        
        if (vendor && vendor.email) {
          // Send notification to vendor
          await sendNewOrderNotificationEmail(vendor.email, vendor.name, order);
          console.log(`New order notification sent to vendor: ${vendor.email}`);
        }

        // Send confirmation to customer if they have an email
        if (customerId) {
          const customer = await User.findById(customerId).select('email firstName lastName');
          if (customer && customer.email) {
            const customerName = customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Valued Customer';
            await sendOrderConfirmationEmail(customer.email, customerName, order);
            console.log(`Order confirmation sent to customer: ${customer.email}`);
          }
        }else{
          // for new customer
           await sendOrderConfirmationEmail(customer_email,"Customer", order);
           console.log(`Order confirmation sent to customer: ${customer_email}`);
        }
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
        // Don't fail the order creation if emails fail
      }
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Public (optional authentication)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('vendorId', 'name cuisine')
      .populate('customerId', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error getting order:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get all orders (vendor only)
// @route   GET /api/orders
// @access  Private (Vendor only)
const getAllOrders = async (req, res) => {
  try {
    const { status, tableNumber, customerId, limit = 50, page = 1 } = req.query;
    
    let query = { vendorId: req.user._id };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by table number
    if (tableNumber) {
      query.tableNumber = tableNumber;
    }
    
    // Filter by customer
    if (customerId) {
      query.customerId = customerId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const orders = await Order.find(query)
      .populate('customerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: orders
    });

  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private (Vendor only)
const updateOrder = async (req, res) => {
  try {
    const {
      items,
      notes,
      estimatedPreparationTime
    } = req.body;

    // Find order and ensure it belongs to the authenticated vendor
    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    // Update fields
    if (items !== undefined) {
      // Recalculate total if items change
      let totalAmount = 0;
      const validatedItems = [];

      for (const item of items) {
        const menuItem = await MenuItem.findById(item.menuItemId);
        
        if (!menuItem) {
          return res.status(400).json({
            success: false,
            message: `Menu item with ID ${item.menuItemId} not found`
          });
        }

        const itemTotal = menuItem.price * item.quantity;
        totalAmount += itemTotal;

        validatedItems.push({
          menuItemId: item.menuItemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          notes: item.notes || ''
        });
      }

      order.items = validatedItems;
      order.totalAmount = totalAmount;
    }

    if (notes !== undefined) order.notes = notes;
    if (estimatedPreparationTime !== undefined) order.estimatedPreparationTime = estimatedPreparationTime;

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });

  } catch (error) {
    console.error('Error updating order:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private (Vendor only)
const deleteOrder = async (req, res) => {
  try {
    // Find order and ensure it belongs to the authenticated vendor
    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    await order.deleteOne();

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Vendor only)
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, preparing, ready, served, cancelled'
      });
    }

    // Find order and ensure it belongs to the authenticated vendor
    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    order.status = status;
    
    // Update actual preparation time when order is ready
    if (status === 'ready' && order.estimatedPreparationTime) {
      order.actualPreparationTime = Date.now() - order.createdAt;
    }

    // Mark as paid when order is served (completed)
    if (status === 'served') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    if(status === 'ready'){
      // Send order rady to customer if they have an email
      if (order.customerId) {
        const customer = await User.findById(order.customerId).select('email firstName lastName');
        if (customer && customer.email) {
          const customerName = customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : 'Valued Customer';
          await sendOrderReadyEmail(customer.email, customerName, order);
          console.log(`Order confirmation sent to customer: ${customer.email}`);
        }
      }else{
        // for new customer
        if(order.customerEmail){
          await sendOrderReadyEmail(order.customerEmail,"Customer", order);
          console.log(`Order confirmation sent to customer: ${order.customerEmail}`);
        }
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update payment status
// @route   PATCH /api/orders/:id/payment-status
// @access  Private (Vendor only)
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus } = req.body;

    if (!['pending', 'paid', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status. Must be one of: pending, paid, refunded'
      });
    }

    // Find order and ensure it belongs to the authenticated vendor
    const order = await Order.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    order.paymentStatus = paymentStatus;
    await order.save();

    res.json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      data: order
    });

  } catch (error) {
    console.error('Error updating payment status:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get today's orders
// @route   GET /api/orders/today
// @access  Private (Vendor only)
const getTodayOrders = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      vendorId: req.user._id,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('customerId', 'firstName lastName email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    console.error('Error getting today\'s orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get orders by status
// @route   GET /api/orders/by-status/:status
// @access  Private (Vendor only)
const getOrdersByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { limit = 50, page = 1 } = req.query;

    if (!['pending', 'preparing', 'ready', 'served', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find({
      vendorId: req.user._id,
      status: status
    })
    .populate('customerId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Order.countDocuments({
      vendorId: req.user._id,
      status: status
    });

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: orders
    });

  } catch (error) {
    console.error('Error getting orders by status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get orders by table
// @route   GET /api/orders/by-table/:tableNumber
// @access  Private (Vendor only)
const getOrdersByTable = async (req, res) => {
  try {
    const { tableNumber } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find({
      vendorId: req.user._id,
      tableNumber: tableNumber
    })
    .populate('customerId', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(skip);

    const total = await Order.countDocuments({
      vendorId: req.user._id,
      tableNumber: tableNumber
    });

    res.json({
      success: true,
      count: orders.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: orders
    });

  } catch (error) {
    console.error('Error getting orders by table:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  createOrder,
  getOrderById,
  getAllOrders,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  getTodayOrders,
  getOrdersByStatus,
  getOrdersByTable
}; 