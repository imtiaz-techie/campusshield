import mongoose from 'mongoose';

const historySchema = new mongoose.Schema(
  {
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true, index: true },
    incidentId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ['Created', 'Status Update', 'Priority Change', 'Assignment', 'Escalation', 'Note'],
      default: 'Status Update',
    },
    previousStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = System
    updatedByName: { type: String, default: 'System' },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.IncidentHistory || mongoose.model('IncidentHistory', historySchema);
