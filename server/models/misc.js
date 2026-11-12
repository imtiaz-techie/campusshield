import mongoose from 'mongoose';
import { PRIORITIES } from '../utils/constants.js';

/* ---------- Incident categories (admin managed) ---------- */
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    icon: { type: String, default: 'AlertCircle' },
    color: { type: String, default: '#64748B' },
    defaultPriority: { type: String, enum: PRIORITIES, default: 'Medium' },
    responseCategory: { type: String, default: 'General Assistance' },
    recommendedAction: { type: String, default: 'Assign the nearest available officer.' },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

/* ---------- Atomic counters for readable incident IDs ---------- */
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

export async function nextIncidentId(date = new Date()) {
  const year = date.getFullYear();
  const c = await Counter.findOneAndUpdate({ _id: `incident-${year}` }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `CS-${year}-${String(c.seq).padStart(4, '0')}`;
}

/* ---------- System settings (single document) ---------- */
const settingSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'system' },
    escalationMinutes: { type: Number, default: 5, min: 1, max: 1440 },
    autoEscalation: { type: Boolean, default: true },
    notifyContactsOnSOS: { type: Boolean, default: true },
    campusName: { type: String, default: 'Daffodil International University' },
    securityHotline: { type: String, default: '+880 1847-140094 (demo)' },
  },
  { timestamps: true }
);
export const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

export async function getSettings() {
  return (await Setting.findById('system').lean()) || (await Setting.create({ _id: 'system' })).toObject();
}

/* ---------- Activity log (admin monitoring) ---------- */
const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userName: { type: String, default: 'System' },
    role: { type: String, default: 'system' },
    action: { type: String, required: true },
    details: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
activitySchema.index({ createdAt: -1 });
export const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activitySchema);

export async function logActivity(user, action, details = '') {
  try {
    await ActivityLog.create({
      user: user?._id || null,
      userName: user?.name || 'System',
      role: user?.role || 'system',
      action,
      details,
    });
  } catch (e) {
    console.error('Activity log failed', e.message);
  }
}
