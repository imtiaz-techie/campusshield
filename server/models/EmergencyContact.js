import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contactName: { type: String, required: true, trim: true, maxlength: 80 },
    relationship: { type: String, required: true, trim: true, maxlength: 40 },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    isPrimary: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.EmergencyContact || mongoose.model('EmergencyContact', contactSchema);
