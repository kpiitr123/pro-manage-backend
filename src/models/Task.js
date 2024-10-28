const mongoose = require('mongoose');

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  isCompleted: {
    type: Boolean,
    default: false
  }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['HIGH', 'MODERATE', 'LOW'],
    required: true
  },
  status: {
    type: String,
    enum: ['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE'],
    default: 'TODO'
  },
  dueDate: {
    type: Date
  },
  checklist: [checklistItemSchema],
  assignees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sharedWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  collapsed: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Index for efficient filtering
taskSchema.index({ dueDate: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ creator: 1 });
taskSchema.index({ assignees: 1 });

module.exports = mongoose.model('Task', taskSchema);