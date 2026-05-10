const express = require('express');
const User = require('../models/User');
const Request = require('../models/Request');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'USER' })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Assign or update quota for a user
router.put('/quota/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { quotaLimit } = req.body;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ message: 'Cannot set quota for admin users' });
    }

    user.quotaLimit = quotaLimit;
    await user.save();

    res.json({
      message: 'Quota updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        quotaLimit: user.quotaLimit,
        quotaUsed: user.quotaUsed,
        remaining: user.quotaLimit - user.quotaUsed
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all requests (admin only)
router.get('/requests', adminAuth, async (req, res) => {
  try {
    const requests = await Request.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update request status (approve/reject)
router.put('/requests/:requestId', adminAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;

    if (!['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = status;
    await request.save();

    res.json({
      message: `Request ${status.toLowerCase()} successfully`,
      request
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// View usage reports (all users' request usage)
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ role: 'USER' }).select('-password');
    
    const reports = await Promise.all(
      users.map(async (user) => {
        const requestCount = await Request.countDocuments({ user: user._id });
        const requests = await Request.find({ user: user._id })
          .sort({ createdAt: -1 })
          .limit(5);
        
        return {
          userId: user._id,
          name: user.name,
          email: user.email,
          quotaLimit: user.quotaLimit,
          quotaUsed: user.quotaUsed,
          remaining: user.quotaLimit - user.quotaUsed,
          totalRequests: requestCount,
          recentRequests: requests
        };
      })
    );

    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
