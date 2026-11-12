import mongoose from 'mongoose';

/**
 * SIMULATED notifications only. Nothing here is ever sent via SMS / email / phone.
 * - notificationType "Emergency Alert": simulated message to a trusted contact
 * - notificationType "Status Update" / "Escalation": in-app notice to the student
 */
const notificationSchema = new mongoose.Schema(
  {
    incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', index: true },
    incidentId: { type: String, index: true }, // human readable incident id
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, // owner (student)
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyContact', default: null },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    channel: { type: String, enum: ['SMS', 'Call', 'In-App'], default: 'In-App' },
    notificationType: { type: String, enum: ['Emergency Alert', 'Status Update', 'Escalation', 'System'], required: true },
    notificationStatus: { type: String, enum: ['Queued', 'Sent', 'Delivered', 'Failed'], default: 'Queued' },
    message: { type: String, required: true, maxlength: 600 },
    read: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
