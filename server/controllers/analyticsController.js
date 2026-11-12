import Incident from '../models/Incident.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Escalation from '../models/Escalation.js';
import { Category } from '../models/misc.js';
import { runEscalationSweep } from '../services/escalationEngine.js';
import { asyncHandler, ok } from '../utils/ApiError.js';
import { ACTIVE_STATUSES, DONE_STATUSES, OPEN_STATUSES, PRIORITIES, STATUSES } from '../utils/constants.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0);

/** GET /api/analytics/summary - dashboard + analytics data for security/admin */
export const summary = asyncHandler(async (req, res) => {
  await runEscalationSweep();
  const months = Math.min(12, Math.max(3, parseInt(req.query.months, 10) || 6));
  const [incidents, categories] = await Promise.all([
    Incident.find().select('incidentId title category categoryName priority status createdAt acknowledgedAt resolvedAt escalationLevel isSOS location').lean(),
    Category.find().lean(),
  ]);

  const count = (fn) => incidents.filter(fn).length;
  const totals = {
    total: incidents.length,
    pending: count((i) => i.status === 'Reported'),
    active: count((i) => ACTIVE_STATUSES.includes(i.status)),
    resolved: count((i) => DONE_STATUSES.includes(i.status)),
    critical: count((i) => i.priority === 'Critical' && OPEN_STATUSES.includes(i.status)),
    criticalAll: count((i) => i.priority === 'Critical'),
    escalated: count((i) => i.escalationLevel > 0 && OPEN_STATUSES.includes(i.status)),
    sos: count((i) => i.isSOS),
    today: count((i) => new Date(i.createdAt).toDateString() === new Date().toDateString()),
  };

  // Monthly trend (last N months)
  const now = new Date();
  const monthly = [];
  for (let k = months - 1; k >= 0; k -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const inMonth = (date) => date && new Date(date).getFullYear() === d.getFullYear() && new Date(date).getMonth() === d.getMonth();
    monthly.push({
      month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      reported: count((i) => inMonth(i.createdAt)),
      resolved: count((i) => inMonth(i.resolvedAt)),
      critical: count((i) => inMonth(i.createdAt) && i.priority === 'Critical'),
    });
  }

  const catMap = Object.fromEntries(categories.map((c) => [c.key, c]));
  const byCategory = Object.values(
    incidents.reduce((acc, i) => {
      acc[i.category] = acc[i.category] || { key: i.category, name: catMap[i.category]?.name || i.categoryName, color: catMap[i.category]?.color || '#64748B', count: 0 };
      acc[i.category].count += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  const byPriority = PRIORITIES.map((p) => ({ name: p, value: count((i) => i.priority === p) }));
  const byStatus = STATUSES.map((s) => ({ name: s, value: count((i) => i.status === s) }));
  const resolvedVsUnresolved = [
    { name: 'Resolved / Closed', value: totals.resolved },
    { name: 'Unresolved', value: totals.total - totals.resolved },
  ];

  const responseMins = incidents.filter((i) => i.acknowledgedAt).map((i) => (new Date(i.acknowledgedAt) - new Date(i.createdAt)) / 60000);
  const resolutionMins = incidents.filter((i) => i.resolvedAt).map((i) => (new Date(i.resolvedAt) - new Date(i.createdAt)) / 60000);
  const responseByPriority = PRIORITIES.map((p) => ({
    name: p,
    minutes: avg(incidents.filter((i) => i.priority === p && i.acknowledgedAt).map((i) => (new Date(i.acknowledgedAt) - new Date(i.createdAt)) / 60000)),
  }));

  const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, '0')}:00`, count: 0 }));
  incidents.forEach((i) => { hourly[new Date(i.createdAt).getHours()].count += 1; });

  const locations = Object.entries(
    incidents.reduce((acc, i) => { if (i.location) acc[i.location] = (acc[i.location] || 0) + 1; return acc; }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const recent = await Incident.find()
    .sort({ createdAt: -1 })
    .limit(8)
    .populate('studentId', 'name studentId')
    .populate('assignedTo', 'name')
    .lean();

  const extra = {};
  if (req.user.role === 'admin') {
    const [students, security, admins, inactive, notifications, escalations] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'security' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: false }),
      Notification.countDocuments({ notificationType: 'Emergency Alert' }),
      Escalation.countDocuments({ escalationStatus: 'Auto-Escalated' }),
    ]);
    extra.users = { students, security, admins, inactive };
    extra.simulatedAlerts = notifications;
    extra.autoEscalations = escalations;
  }

  ok(res, {
    totals,
    monthly,
    byCategory,
    byPriority,
    byStatus,
    resolvedVsUnresolved,
    avgResponseMinutes: avg(responseMins),
    avgResolutionMinutes: avg(resolutionMins),
    responseByPriority,
    hourly,
    locations,
    recent,
    ...extra,
  });
});

/** GET /api/analytics/me - student personal stats */
export const studentSummary = asyncHandler(async (req, res) => {
  const incidents = await Incident.find({ studentId: req.user._id }).sort({ createdAt: -1 }).lean();
  ok(res, {
    total: incidents.length,
    open: incidents.filter((i) => OPEN_STATUSES.includes(i.status)).length,
    resolved: incidents.filter((i) => DONE_STATUSES.includes(i.status)).length,
    critical: incidents.filter((i) => i.priority === 'Critical').length,
    recent: incidents.slice(0, 5),
  });
});
