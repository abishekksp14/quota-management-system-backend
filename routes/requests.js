const express = require('express');
const User = require('../models/User');
const Request = require('../models/Request');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Submit request (quota validated)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description } = req.body;
    const userId = req.userId;

    // Get user from database to check quota
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check quota BEFORE processing
    const remainingQuota = user.quotaLimit - user.quotaUsed;
    
    if (remainingQuota <= 0) {
      return res.status(403).json({ 
        message: 'Quota exhausted. Request rejected.',
        quotaLimit: user.quotaLimit,
        quotaUsed: user.quotaUsed,
        remaining: 0
      });
    }

    // Create request
    const request = new Request({
      user: userId,
      title,
      description,
      status: 'PENDING'
    });

    await request.save();

    // Deduct quota (update in database)
    user.quotaUsed += 1;
    await user.save();

    res.status(201).json({
      message: 'Request submitted successfully',
      request,
      quotaRemaining: user.quotaLimit - user.quotaUsed
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get logged-in user's requests
router.get('/me', auth, async (req, res) => {
  try {
    const requests = await Request.find({ user: req.userId })
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user's own request
router.put('/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { title, description } = req.body;

    const request = await Request.findOne({ _id: requestId, user: req.userId });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Only allow editing if status is PENDING
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot edit a request that has already been processed' });
    }

    request.title = title;
    request.description = description;
    await request.save();

    res.json({
      message: 'Request updated successfully',
      request
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete user's own request and refund quota
router.delete('/:requestId', auth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await Request.findOne({ _id: requestId, user: req.userId });
    
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Refund quota to user
    const user = await User.findById(req.userId);
    if (user && user.quotaUsed > 0) {
      user.quotaUsed -= 1;
      await user.save();
    }

    await Request.findByIdAndDelete(requestId);

    res.json({
      message: 'Request deleted and quota refunded',
      quotaUsed: user.quotaUsed,
      quotaRemaining: user.quotaLimit - user.quotaUsed
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
