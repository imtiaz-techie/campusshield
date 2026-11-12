import mongoose from 'mongoose';
import User from '../models/User.js';
import EmergencyContact from '../models/EmergencyContact.js';
import Incident from '../models/Incident.js';
import { ActivityLog, Setting, getSettings, logActivity } from '../models/misc.js';
import { ApiError, asyncHandler, ok, created } from '../utils/ApiError.js';
import { Validator, patterns, clean, normalizePhone, escapeRegex } from '../utils/validate.js';
import { ROLES, OPEN_STATUSES } from '../utils/constants.js';
import { DEPARTMENTS } from './authController.js';

/* GET /api/users?role=&q=&status= */
export const listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'inactive') filter.isActive = false;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(req.query.q.trim()), 'i');
    filter.$or = [{ name: rx }, { email: rx }, { studentId: rx }, { phone: rx }];
  }
  const users = await User.find(filter).sort({ role: 1, createdAt: -1 }).lean();
  const counts = await Incident.aggregate([{ $group: { _id: '$studentId', n: { $sum: 1 } } }]);
  const assigned = await Incident.aggregate([{ $match: { assignedTo: { $ne: null } } }, { $group: { _id: '$assignedTo', n: { $sum: 1 } } }]);
  const cMap = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  const aMap = Object.fromEntries(assigned.map((c) => [String(c._id), c.n]));
  users.forEach((u) => {
    delete u.password;
    u.incidentCount = cMap[String(u._id)] || 0;
    u.assignedCount = aMap[String(u._id)] || 0;
  });
  ok(res, users);
});

/* GET /api/users/officers - security list for assignment (security/admin) */
export const listOfficers = asyncHandler(async (_req, res) => {
  const officers = await User.find({ role: { $in: ['security', 'admin'] }, isActive: true }).select('name email phone role').sort({ role: -1, name: 1 }).lean();
  const load = await Incident.aggregate([
    { $match: { assignedTo: { $ne: null }, status: { $in: OPEN_STATUSES } } },
    { $group: { _id: '$assignedTo', n: { $sum: 1 } } },
  ]);
  const map = Object.fromEntries(load.map((l) => [String(l._id), l.n]));
  officers.forEach((o) => { o.openAssignments = map[String(o._id)] || 0; });
  ok(res, officers);
});

function readUser(body, { partial = false } = {}) {
  const data = {};
  const v = new Validator();
  const set = (k, val) => { if (!partial || body[k] !== undefined) data[k] = val; };
  set('name', clean(body.name, 80));
  set('email', clean(body.email, 120).toLowerCase());
  set('phone', normalizePhone(body.phone));
  set('role', body.role);
  set('department', clean(body.department, 80));
  set('studentId', clean(body.studentId, 20) || null);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (data.name !== undefined) v.required('name', data.name, 'Name').length('name', data.name, 3, 80, 'Name');
  if (data.email !== undefined) v.required('email', data.email, 'Email').match('email', data.email, patterns.email, 'Enter a valid email');
  if (data.phone !== undefined) v.required('phone', data.phone, 'Phone').match('phone', data.phone, patterns.phone, 'Enter a valid Bangladeshi mobile number');
  if (data.role !== undefined) v.required('role', data.role, 'Role').oneOf('role', data.role, ROLES, 'Role');
  const role = data.role;
  if (role === 'student') {
    v.required('studentId', data.studentId, 'Student ID').match('studentId', data.studentId, patterns.studentId, 'Student ID must look like 232-35-456');
    v.oneOf('department', data.department, DEPARTMENTS, 'Department');
  } else if (role) {
    data.studentId = null;
  }
  if (!partial || body.password) {
    v.required('password', body.password, 'Password').match('password', body.password, patterns.password, 'Password must be 6+ characters with a letter and a number');
    data.password = String(body.password || '');
  }
  v.assert();
  return data;
}

export const createUser = asyncHandler(async (req, res) => {
  const data = readUser(req.body);
  if (await User.exists({ email: data.email })) throw ApiError.conflict('An account with this email already exists');
  const user = await User.create(data);
  await logActivity(req.user, 'Created user', `${user.role}: ${user.email}`);
  created(res, user.toJSON(), 'User account created');
});

export const updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid user id');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  const body = { ...req.body, role: req.body.role ?? user.role };
  if (body.role === 'student' && body.studentId === undefined) body.studentId = user.studentId;
  if (body.role === 'student' && body.department === undefined) body.department = user.department;
  const data = readUser(body, { partial: true });
  if (String(user._id) === String(req.user._id) && (data.role && data.role !== 'admin' || data.isActive === false)) {
    throw ApiError.badRequest('You cannot demote or deactivate your own account');
  }
  if (data.email && data.email !== user.email && (await User.exists({ email: data.email }))) {
    throw ApiError.conflict('An account with this email already exists');
  }
  if (!data.password) delete data.password;
  Object.assign(user, data);
  await user.save();
  await logActivity(req.user, 'Updated user', `${user.email}${data.isActive === false ? ' (deactivated)' : ''}`);
  ok(res, user.toJSON(), 'User updated');
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid user id');
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (await Incident.exists({ studentId: user._id })) {
    throw ApiError.badRequest('This student has incident records. Deactivate the account instead to keep the audit trail.');
  }
  await Incident.updateMany({ assignedTo: user._id }, { assignedTo: null });
  await EmergencyContact.deleteMany({ userId: user._id });
  await user.deleteOne();
  await logActivity(req.user, 'Deleted user', user.email);
  ok(res, { id: user._id }, 'User deleted');
});

/* GET /api/admin/activity */
export const activityLog = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) filter.$or = [{ action: new RegExp(escapeRegex(req.query.q), 'i') }, { userName: new RegExp(escapeRegex(req.query.q), 'i') }, { details: new RegExp(escapeRegex(req.query.q), 'i') }];
  const limit = Math.min(200, parseInt(req.query.limit, 10) || 60);
  const items = await ActivityLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  ok(res, items);
});

/* GET/PUT /api/admin/settings */
export const getSystemSettings = asyncHandler(async (_req, res) => ok(res, await getSettings()));

export const updateSystemSettings = asyncHandler(async (req, res) => {
  const v = new Validator();
  const data = {};
  if (req.body.escalationMinutes !== undefined) {
    data.escalationMinutes = Number(req.body.escalationMinutes);
    v.custom('escalationMinutes', Number.isInteger(data.escalationMinutes) && data.escalationMinutes >= 1 && data.escalationMinutes <= 1440, 'Escalation time must be 1-1440 minutes');
  }
  if (req.body.autoEscalation !== undefined) data.autoEscalation = Boolean(req.body.autoEscalation);
  if (req.body.notifyContactsOnSOS !== undefined) data.notifyContactsOnSOS = Boolean(req.body.notifyContactsOnSOS);
  if (req.body.securityHotline !== undefined) data.securityHotline = clean(req.body.securityHotline, 40);
  v.assert();
  const s = await Setting.findByIdAndUpdate('system', data, { new: true, upsert: true, setDefaultsOnInsert: true });
  await logActivity(req.user, 'Updated system settings', JSON.stringify(data));
  ok(res, s, 'Settings saved');
});

/* Public-ish settings any logged-in user can read (hotline, escalation time) */
export const publicSettings = asyncHandler(async (_req, res) => {
  const s = await getSettings();
  ok(res, { securityHotline: s.securityHotline, escalationMinutes: s.escalationMinutes, campusName: s.campusName });
});
