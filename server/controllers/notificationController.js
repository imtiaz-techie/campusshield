import Notification from '../models/Notification.js';
import { advanceSimulatedDeliveries } from '../services/escalationEngine.js';
import { ApiError, asyncHandler, ok } from '../utils/ApiError.js';
import { escapeRegex } from '../utils/validate.js';

const scope = (user) => (user.role === 'student' ? { recipientUser: user._id } : {});

/** GET /api/notifications?type=&incidentId=&page= */
export const listNotifications = asyncHandler(async (req, res) => {
  await advanceSimulatedDeliveries();
  const filter = { ...scope(req.user) };
  if (req.query.type) filter.notificationType = req.query.type;
  if (req.query.incidentId) filter.incidentId = new RegExp(escapeRegex(req.query.incidentId.trim()), 'i');
  if (req.query.unread === 'true') filter.read = false;
  // Staff see the contact-alert simulations log by default
  if (req.user.role !== 'student' && !req.query.type) filter.notificationType = 'Emergency Alert';

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 30);
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('recipientUser', 'name studentId').lean(),
    Notification.countDocuments(filter),
    req.user.role === 'student' ? Notification.countDocuments({ recipientUser: req.user._id, read: false }) : 0,
  ]);
  ok(res, items, 'OK', { page, limit, total, pages: Math.ceil(total / limit) || 1, unread });
});

/** GET /api/notifications/unread-count */
export const unreadCount = asyncHandler(async (req, res) => {
  if (req.user.role !== 'student') return ok(res, { unread: 0 });
  const unread = await Notification.countDocuments({ recipientUser: req.user._id, read: false });
  ok(res, { unread });
});

export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, ...scope(req.user) }, { read: true }, { new: true });
  if (!n) throw ApiError.notFound('Notification not found');
  ok(res, n, 'Marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  const r = await Notification.updateMany({ ...scope(req.user), read: false }, { read: true });
  ok(res, { updated: r.modifiedCount }, 'All notifications marked as read');
});
