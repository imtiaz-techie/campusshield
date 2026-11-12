import mongoose from 'mongoose';
import { PRIORITIES } from '../utils/constants.js';

const escalationSchema = new mongoose.Schema(
  {
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    incidentId: { type: String, required: true, index: true },
    priority: { type: String, enum: PRIORITIES, required: true },
    responseCategory: { type: String, required: true },
    recommendedAction: { type: String, required: true },
    escalationStatus: {
      type: String,
      enum: ['Analyzed', 'Immediate Attention', 'Auto-Escalated', 'Acknowledged', 'Resolved'],
      default: 'Analyzed',
    },
    level: { type: Number, default: 0 },
    reasons: [{ type: String }],
    nextSteps: [{ type: String }],
  },
  { timestamps: true }
);

export default mongoose.models.Escalation || mongoose.model('Escalation', escalationSchema);
