import EmergencyContact from '../models/EmergencyContact.js';
import { logActivity } from '../models/misc.js';
import { ApiError, asyncHandler, ok, created } from '../utils/ApiError.js';
import { Validator, patterns, clean, normalizePhone } from '../utils/validate.js';

const MAX_CONTACTS = 10;
export const RELATIONSHIPS = ['Parent', 'Mother', 'Father', 'Sibling', 'Spouse', 'Relative', 'Friend', 'Roommate', 'Guardian', 'Teacher', 'Other'];

function readContact(body) {
  const data = {
    contactName: clean(body.contactName, 80),
    relationship: clean(body.relationship, 40),
    phone: normalizePhone(body.phone),
    email: clean(body.email, 120).toLowerCase(),
    isPrimary: Boolean(body.isPrimary),
  };
  const v = new Validator();
  v.required('contactName', data.contactName, 'Contact name').length('contactName', data.contactName, 2, 80, 'Contact name');
  v.required('relationship', data.relationship, 'Relationship').oneOf('relationship', data.relationship, RELATIONSHIPS, 'Relationship');
  v.required('phone', data.phone, 'Phone number').match('phone', data.phone, patterns.phone, 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)');
  v.match('email', data.email, patterns.email, 'Enter a valid email address');
  v.assert();
  return data;
}

export const listContacts = asyncHandler(async (req, res) => {
  const contacts = await EmergencyContact.find({ userId: req.user._id }).sort({ isPrimary: -1, createdAt: 1 });
  ok(res, contacts);
});

export const createContact = asyncHandler(async (req, res) => {
  const data = readContact(req.body);
  const count = await EmergencyContact.countDocuments({ userId: req.user._id });
  if (count >= MAX_CONTACTS) throw ApiError.badRequest(`You can save up to ${MAX_CONTACTS} trusted contacts`);
  if (await EmergencyContact.exists({ userId: req.user._id, phone: data.phone })) {
    throw ApiError.conflict('A contact with this phone number already exists');
  }
  if (data.isPrimary || count === 0) {
    data.isPrimary = true;
    await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
  }
  const contact = await EmergencyContact.create({ ...data, userId: req.user._id });
  await logActivity(req.user, 'Added emergency contact', data.contactName);
  created(res, contact, 'Trusted contact added');
});

export const updateContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findOne({ _id: req.params.id, userId: req.user._id });
  if (!contact) throw ApiError.notFound('Contact not found');
  const data = readContact(req.body);
  if (await EmergencyContact.exists({ userId: req.user._id, phone: data.phone, _id: { $ne: contact._id } })) {
    throw ApiError.conflict('A contact with this phone number already exists');
  }
  if (data.isPrimary) await EmergencyContact.updateMany({ userId: req.user._id }, { isPrimary: false });
  Object.assign(contact, data);
  await contact.save();
  await logActivity(req.user, 'Updated emergency contact', data.contactName);
  ok(res, contact, 'Contact updated');
});

export const deleteContact = asyncHandler(async (req, res) => {
  const contact = await EmergencyContact.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!contact) throw ApiError.notFound('Contact not found');
  if (contact.isPrimary) {
    const next = await EmergencyContact.findOne({ userId: req.user._id }).sort({ createdAt: 1 });
    if (next) await EmergencyContact.updateOne({ _id: next._id }, { isPrimary: true });
  }
  await logActivity(req.user, 'Deleted emergency contact', contact.contactName);
  ok(res, { id: contact._id }, 'Contact deleted');
});

export const relationships = (_req, res) => ok(res, RELATIONSHIPS);
