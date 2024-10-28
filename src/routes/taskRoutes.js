const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const auth = require('../middleware/auth');
const moment = require('moment');

// Create a new task
router.post('/', auth, async (req, res) => {
  try {
    const { title, priority, dueDate, checklist, assignees } = req.body;
    
    // Create task object with the checklist items directly
    const task = new Task({
      title,
      priority,
      dueDate: dueDate || null, // Handle empty date string
      checklist: checklist, // Pass checklist array directly since it already has the correct structure
      assignees,
      creator: req.userId
    });

    await task.save();
    
    await task.populate('assignees', 'name email');
    res.status(201).json(task);
  } catch (error) {
    console.error('Task creation error:', error); // Add error logging
    res.status(500).json({ message: error.message });
  }
});


// Get all tasks for a user (including assigned and shared)
router.get('/', auth, async (req, res) => {
  try {
    const { filter } = req.query;
    let dateFilter = {};

    if (filter) {
      const today = moment().startOf('day');
      const weekStart = moment().startOf('isoWeek');
      const weekEnd = moment().endOf('isoWeek');
      const monthStart = moment().startOf('month');
      const monthEnd = moment().endOf('month');

      switch (filter) {
        case 'today':
          dateFilter = {
            $or: [
              { dueDate: { $gte: today.toDate(), $lt: moment(today).endOf('day').toDate() } },
              { dueDate: null }
            ]
          };
          break;
        case 'week':
          dateFilter = {
            $or: [
              { dueDate: { $gte: weekStart.toDate(), $lte: weekEnd.toDate() } },
              { dueDate: null }
            ]
          };
          break;
        case 'month':
          dateFilter = {
            $or: [
              { dueDate: { $gte: monthStart.toDate(), $lte: monthEnd.toDate() } },
              { dueDate: null }
            ]
          };
          break;
      }
    }

    const tasks = await Task.find({
      $and: [
        {
          $or: [
            { creator: req.userId },
            { assignees: req.userId },
            { sharedWith: req.userId }
          ]
        },
        dateFilter
      ]
    }).populate('assignees', 'name email')
      .populate('creator', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id,
        $or: [
          { creator: req.userId },
          { assignees: req.userId },
          { sharedWith: req.userId }
        ]
      },
      { status },
      { new: true }
    ).populate('assignees', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle checklist item
router.patch('/:id/checklist/:itemId', auth, async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      $or: [
        { creator: req.userId },
        { assignees: req.userId },
        { sharedWith: req.userId }
      ]
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const checklistItem = task.checklist.id(req.params.itemId);
    if (!checklistItem) {
      return res.status(404).json({ message: 'Checklist item not found' });
    }

    checklistItem.isCompleted = !checklistItem.isCompleted;
    await task.save();

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Share task
router.post('/:id/share', auth, async (req, res) => {
  try {
    const { userIds } = req.body;
    const task = await Task.findOneAndUpdate(
      { 
        _id: req.params.id,
        creator: req.userId
      },
      { $addToSet: { sharedWith: { $each: userIds } } },
      { new: true }
    ).populate('assignees', 'name email')
      .populate('sharedWith', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle column collapse state
router.patch('/:id/collapse', auth, async (req, res) => {
    try {
      const { collapsed } = req.body;
      const task = await Task.findOneAndUpdate(
        { _id: req.params.id },
        { collapsed },
        { new: true }
      );
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Error updating collapse state' });
    }
  });
  
  // Share task with users
  router.post('/:id/share', auth, async (req, res) => {
    try {
      const { userIds } = req.body;
      const task = await Task.findOneAndUpdate(
        { _id: req.params.id },
        { $addToSet: { sharedWith: { $each: userIds } } },
        { new: true }
      ).populate('assignees sharedWith', 'name email');
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Error sharing task' });
    }
  });
  
  // Remove user from shared list
  router.delete('/:id/share/:userId', auth, async (req, res) => {
    try {
      const task = await Task.findOneAndUpdate(
        { _id: req.params.id },
        { $pull: { sharedWith: req.params.userId } },
        { new: true }
      ).populate('assignees sharedWith', 'name email');
      
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: 'Error removing shared user' });
    }
  });
  
  // Get tasks by filter
  router.get('/filter', auth, async (req, res) => {
    try {
      const { type } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let dateFilter = {};
      
      switch (type) {
        case 'today':
          dateFilter = {
            dueDate: {
              $gte: today,
              $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
            }
          };
          break;
        case 'week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          dateFilter = {
            dueDate: { $gte: weekStart, $lte: weekEnd }
          };
          break;
        case 'month':
          const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          dateFilter = {
            dueDate: { $gte: monthStart, $lte: monthEnd }
          };
          break;
      }
  
      const tasks = await Task.find({
        $and: [
          {
            $or: [
              { creator: req.userId },
              { assignees: req.userId },
              { sharedWith: req.userId }
            ]
          },
          dateFilter
        ]
      }).populate('assignees creator sharedWith', 'name email');
  
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching filtered tasks' });
    }
  });

module.exports = router;