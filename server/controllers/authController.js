import User from '../models/User.js';
import { logActivity } from '../models/misc.js';
import { signToken } from '../middleware/auth.js';
import { ApiError, asyncHandler, ok, created } from '../utils/ApiError.js';
import { Validator, patterns, clean, normalizePhone } from '../utils/validate.js';

export const DEPARTMENTS = [
  'Software Engineering', 'Computer Science & Engineering', 'Computing & Information Systems', 'Multimedia & Creative Technology',
  'Electrical & Electronic Engineering', 'Civil Engineering', 'Textile Engineering', 'Business Administration',
  'English', 'Law', 'Pharmacy', 'Nutrition & Food Engineering', 'Other',
];

const authPayload = (user) => ({ token: signToken(user), user: user.toJSON() });

export const register = asyncHandler(async (req, res) => {
  const name = clean(req.body.name, 80);
  const studentId = clean(req.body.studentId, 20);
  const email = clean(req.body.email, 120).toLowerCase();
  const phone = normalizePhone(req.body.phone);
  const department = clean(req.body.department, 80);
  const password = String(req.body.password || '');
  const confirmPassword = req.body.confirmPassword;

  const v = new Validator();
  v.required('name', name, 'Full name').length('name', name, 3, 80, 'Full name')
    .match('name', name, /^[A-Za-z .'-]+$/, 'Name may only contain letters, spaces and . \' -');
  v.required('studentId', studentId, 'Student ID').match('studentId', studentId, patterns.studentId, 'Student ID must look like 232-35-456');
  v.required('email', email, 'University email').match('email', email, patterns.universityEmail, 'Use your DIU email (e.g. name@diu.edu.bd)');
  v.required('phone', phone, 'Phone number').match('phone', phone, patterns.phone, 'Enter a valid Bangladeshi mobile number (e.g. 01712345678)');
  v.required('department', department, 'Department').oneOf('department', department, DEPARTMENTS, 'Department');
  v.required('password', password, 'Password').match('password', password, patterns.password, 'Password must be 6+ characters with at least one letter and one number');
  if (confirmPassword !== undefined) v.custom('confirmPassword', confirmPassword === password, 'Passwords do not match');
  v.assert();

  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  if (await User.exists({ studentId })) throw ApiError.conflict('An account with this student ID already exists');

  const user = await User.create({ name, studentId, email, phone, department, password, role: 'student' });
  await logActivity(user, 'Registered', `New student account ${studentId}`);
  created(res, authPayload(user), 'Registration successful');
});

export const login = asyncHandler(async (req, res) => {
  const email = clean(req.body.email, 120).toLowerCase();
  const password = String(req.body.password || '');
  const v = new Validator();
  v.required('email', email, 'Email').match('email', email, patterns.email, 'Enter a valid email');
  v.required('password', password, 'Password');
  v.assert();

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw ApiError.unauthorized('Invalid email or password');
  if (!user.isActive) throw ApiError.forbidden('Your account has been deactivated. Contact the administrator.');

  user.lastLoginAt = new Date();
  await user.save();
  await logActivity(user, 'Logged in', `${user.role} login`);
  ok(res, authPayload(user), 'Login successful');
});

export const me = asyncHandler(async (req, res) => ok(res, req.user.toJSON()));

export const updateProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const v = new Validator();
  if (req.body.name !== undefined) {
    const name = clean(req.body.name, 80);
    v.required('name', name, 'Full name').length('name', name, 3, 80, 'Full name');
    user.name = name;
  }
  if (req.body.phone !== undefined) {
    const phone = normalizePhone(req.body.phone);
    v.required('phone', phone, 'Phone').match('phone', phone, patterns.phone, 'Enter a valid Bangladeshi mobile number');
    user.phone = phone;
  }
  if (req.body.department !== undefined && user.role === 'student') {
    const department = clean(req.body.department, 80);
    v.oneOf('department', department, DEPARTMENTS, 'Department');
    user.department = department;
  }
  if (req.body.locationSharing !== undefined) user.locationSharing = Boolean(req.body.locationSharing);
  v.assert();
  await user.save();
  await logActivity(user, 'Updated profile');
  ok(res, user.toJSON(), 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword = '', newPassword = '' } = req.body;
  const v = new Validator();
  v.required('currentPassword', currentPassword, 'Current password');
  v.required('newPassword', newPassword, 'New password').match('newPassword', newPassword, patterns.password, 'Password must be 6+ characters with a letter and a number');
  v.assert();
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(String(currentPassword)))) throw ApiError.badRequest('Current password is incorrect');
  user.password = String(newPassword);
  await user.save();
  await logActivity(user, 'Changed password');
  ok(res, null, 'Password changed');
});

export const departments = (_req, res) => ok(res, DEPARTMENTS);
