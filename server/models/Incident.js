import mongoose from 'mongoose';
import { PRIORITIES, STATUSES } from '../utils/constants.js';

const incidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true }, // e.g. CS-2026-0001
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, index: true }, // category key
    categoryName: { type: String, required: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    location: { type: String, trim: true, maxlength: 160, default: '' },
    latitude: { type: Number, default: null, min: -90, max: 90 },
    longitude: { type: Number, default: null, min: -180, max: 180 },
    locationShared: { type: Boolean, default: false },
    incidentDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    isSOS: { type: Boolean, default: false },

    priority: { type: String, enum: PRIORITIES, default: 'Medium', index: true },
    priorityReasons: [{ type: String }],
    priorityOverridden: { type: Boolean, default: false },
    status: { type: String, enum: STATUSES, default: 'Reported', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Escalation workflow output
    responseCategory: { type: String, default: '' },
    recommendedAction: { type: String, default: '' },
    escalationLevel: { type: Number, default: 0 },
    escalated: { type: Boolean, default: false },

    acknowledgedAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

incidentSchema.index({ createdAt: -1 });
incidentSchema.index({ status: 1, priority: 1, createdAt: 1 });

export default mongoose.models.Incident || mongoose.model('Incident', incidentSchema);
