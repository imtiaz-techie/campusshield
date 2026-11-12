import mongoose from 'mongoose';
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Escalation from '../models/Escalation.js';
import Notification from '../models/Notification.js';
import EmergencyContact from '../models/EmergencyContact.js';
import User from '../models/User.js';
import { Category, getSettings, logActivity, nextIncidentId } from '../models/misc.js';
import {
  analyzeIncident, recordInitialEscalation, runEscalationSweep, simulateContactNotifications,
  advanceSimulatedDeliveries, nextActionFor,
} from '../services/escalationEngine.js';
import { ApiError, asyncHandler, ok, created } from '../utils/ApiError.js';
import { Validator, clean, escapeRegex } from '../utils/validate.js';
import { PRIORITIES, STATUSES, STATUS_FLOW, OPEN_STATUSES, DONE_STATUSES } from '../utils/constants.js';

const isStaff = (user) => user.role === 'security' || user.role === 'admin';

/** Find by Mongo _id or human-readable incidentId; enforce ownership for students. */
async function loadIncident(idParam, user) {
  const filter = mongoose.isValidObjectId(idParam) ? { _id: idParam } : { incidentId: String(idParam).toUpperCase() };
  const incident = await Incident.findOne(filter)
    .populate('studentId', 'name studentId email phone department')
    .populate('assignedTo', 'name email phone');
  if (!incident) throw ApiError.notFound('Incident not found');
  if (!isStaff(user) && String(incident.studentId?._id) !== String(user._id)) {
    throw ApiError.forbidden('You can only view your own incident reports');
  }
  return incident;
}

const toNum = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

/* ------------------------------------------------------------------ */
/* POST /api/incidents/analyze  - live priority preview for the form    */
/* ------------------------------------------------------------------ */
export const analyzePreview = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ key: clean(req.body.category, 60) }).lean();
  if (!category) throw ApiError.badRequest('Select a valid emergency category');
  const analysis = analyzeIncident({
    category,
    title: clean(req.body.title, 120),
    description: clean(req.body.description, 2000),
    isSOS: Boolean(req.body.isSOS),
    incidentDate: req.body.incidentDate ? new Date(req.body.incidentDate) : new Date(),
  });
  ok(res, analysis);
});

/* ------------------------------------------------------------------ */
/* POST /api/incidents  - student submits SOS or detailed report       */
/* ------------------------------------------------------------------ */
export const createIncident = asyncHandler(async (req, res) => {
  const student = req.user;
  const isSOS = Boolean(req.body.isSOS);
  const categoryKey = clean(req.body.category, 60);
  const description = clean(req.body.description, 2000);
  const location = clean(req.body.location, 160);
  const notes = clean(req.body.notes, 1000);
  const wantsShare = req.body.shareLocation !== false && student.locationSharing !== false;
  const lat = toNum(req.body.latitude);
  const lng = toNum(req.body.longitude);
  const incidentDate = req.body.incidentDate ? new Date(req.body.incidentDate) : new Date();

  const category = await Category.findOne({ key: categoryKey, isActive: true }).lean();
  const v = new Validator();
  v.custom('category', !!category, 'Select a valid emergency category');
  if (isSOS) {
    v.required('description', description, 'Short description').length('description', description, 5, 2000, 'Description');
  } else {
    const title = clean(req.body.title, 120);
    v.required('title', title, 'Incident title').length('title', title, 5, 120, 'Title');
    v.required('description', description, 'Description').length('description', description, 15, 2000, 'Description');
    v.required('location', location, 'Incident location').length('location', location, 3, 160, 'Location');
    v.required('incidentDate', req.body.incidentDate, 'Incident date & time');
  }
  v.custom('incidentDate', !Number.isNaN(incidentDate.getTime()), 'Invalid date');
  v.custom('incidentDate', incidentDate.getTime() <= Date.now() + 5 * 60_000, 'Incident date cannot be in the future');
  v.custom('incidentDate', incidentDate.getTime() >= Date.now() - 30 * 86_400_000, 'Only incidents from the last 30 days can be reported');
  if (wantsShare && (lat !== null || lng !== null)) {
    v.custom('latitude', lat !== null && Number.isFinite(lat) && lat >= -90 && lat <= 90, 'Latitude must be between -90 and 90');
    v.custom('longitude', lng !== null && Number.isFinite(lng) && lng >= -180 && lng <= 180, 'Longitude must be between -180 and 180');
  }
  v.assert();

  const title = isSOS ? clean(req.body.title, 120) || `SOS: ${category.name}` : clean(req.body.title, 120);
  const analysis = analyzeIncident({ category, title, description, isSOS, incidentDate });
  const shared = wantsShare && lat !== null && lng !== null;

  const incident = await Incident.create({
    incidentId: await nextIncidentId(),
    studentId: student._id,
    title,
    category: category.key,
    categoryName: category.name,
    description,
    location: location || (isSOS ? 'Location via SOS' : ''),
    latitude: shared ? lat : null,
    longitude: shared ? lng : null,
    locationShared: shared,
    incidentDate,
    notes,
    isSOS,
    priority: analysis.priority,
    priorityReasons: analysis.reasons,
    responseCategory: analysis.responseCategory,
    recommendedAction: analysis.recommendedAction,
  });

  await IncidentHistory.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    action: 'Created',
    newStatus: 'Reported',
    updatedBy: student._id,
    updatedByName: student.name,
    notes: isSOS ? 'SOS emergency triggered by student' : 'Incident report submitted',
  });
  await recordInitialEscalation(incident, analysis);

  // Simulated trusted-contact alerts (no real SMS/calls)
  const settings = await getSettings();
  let notifications = [];
  const notifyContacts = req.body.notifyContacts !== false && (settings.notifyContactsOnSOS || !isSOS);
  if (notifyContacts) {
    const contacts = await EmergencyContact.find({ userId: student._id }).lean();
    notifications = await simulateContactNotifications(incident, student, contacts);
  }
  await Notification.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    recipientUser: student._id,
    channel: 'In-App',
    notificationType: 'Status Update',
    notificationStatus: 'Delivered',
    deliveredAt: new Date(),
    message: `Your report ${incident.incidentId} was received. Priority: ${analysis.priority}. Campus security has been alerted.`,
  });
  await logActivity(student, isSOS ? 'Triggered SOS' : 'Submitted incident', `${incident.incidentId} (${category.name}, ${analysis.priority})`);

  created(res, { incident, analysis, notifications }, isSOS ? 'SOS alert sent to campus security' : 'Incident report submitted');
});

/* ------------------------------------------------------------------ */
/* GET /api/incidents  - students: own reports, staff: everything      */
/* ------------------------------------------------------------------ */
export const listIncidents = asyncHandler(async (req, res) => {
  const user = req.user;
  if (isStaff(user)) await runEscalationSweep();

  const { q = '', category = '', status = '', priority = '', assigned = '', from = '', to = '', sort = '-createdAt' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = {};
  if (!isStaff(user)) filter.studentId = user._id;
  if (q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), 'i');
    filter.$or = [{ incidentId: rx }, { title: rx }, { location: rx }];
  }
  if (category) filter.category = category;
  if (status === 'open') filter.status = { $in: OPEN_STATUSES };
  else if (status === 'done') filter.status = { $in: DONE_STATUSES };
  else if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assigned === 'me' && isStaff(user)) filter.assignedTo = user._id;
  if (assigned === 'none' && isStaff(user)) filter.assignedTo = null;
  if (from || to) {
    filter.createdAt = {};
    if (from && !Number.isNaN(Date.parse(from))) filter.createdAt.$gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) filter.createdAt.$lte = new Date(`${to}T23:59:59`);
  }

  const sortMap = { '-createdAt': { createdAt: -1 }, createdAt: { createdAt: 1 }, priority: { priorityRank: 1, createdAt: -1 } };
  let query;
  if (sort === 'priority') {
    query = Incident.aggregate([
      { $match: filter },
      { $addFields: { priorityRank: { $indexOfArray: [PRIORITIES, '$priority'] } } },
      { $sort: sortMap.priority },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]);
  }
  const [items, total] = await Promise.all([
    sort === 'priority'
      ? query.then((docs) => Incident.populate(docs, [
        { path: 'studentId', select: 'name studentId phone' }, { path: 'assignedTo', select: 'name' }]))
      : Incident.find(filter)
        .sort(sortMap[sort] || sortMap['-createdAt'])
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('studentId', 'name studentId phone')
        .populate('assignedTo', 'name')
        .lean(),
    Incident.countDocuments(filter),
  ]);
  ok(res, items, 'OK', { page, limit, total, pages: Math.ceil(total / limit) || 1 });
});

/* ------------------------------------------------------------------ */
/* GET /api/incidents/:id  - details + timeline + escalation + sims    */
/* ------------------------------------------------------------------ */
export const getIncident = asyncHandler(async (req, res) => {
  if (isStaff(req.user)) await runEscalationSweep();
  await advanceSimulatedDeliveries();
  const incident = await loadIncident(req.params.id, req.user);
  const [history, escalations, notifications] = await Promise.all([
    IncidentHistory.find({ incident: incident._id }).sort({ createdAt: 1 }).lean(),
    Escalation.find({ incident: incident._id }).sort({ createdAt: -1 }).lean(),
    Notification.find({ incident: incident._id, notificationType: 'Emergency Alert' }).sort({ createdAt: 1 }).lean(),
  ]);
  ok(res, {
    incident,
    history,
    escalations,
    notifications,
    nextAction: nextActionFor(incident),
    allowedStatuses: STATUS_FLOW[incident.status] || [],
  });
});

async function notifyStudent(incident, message, type = 'Status Update') {
  await Notification.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    recipientUser: incident.studentId?._id || incident.studentId,
    channel: 'In-App',
    notificationType: type,
    notificationStatus: 'Delivered',
    deliveredAt: new Date(),
    message,
  });
}

/* ------------------------------------------------------------------ */
/* PATCH /api/incidents/:id/status  (security/admin)                   */
/* ------------------------------------------------------------------ */
export const updateStatus = asyncHandler(async (req, res) => {
  const incident = await loadIncident(req.params.id, req.user);
  const newStatus = req.body.status;
  const notes = clean(req.body.notes, 1000);
  const v = new Validator();
  v.required('status', newStatus, 'Status').oneOf('status', newStatus, STATUSES, 'Status');
  v.assert();

  const previousStatus = incident.status;
  if (previousStatus === newStatus) throw ApiError.badRequest(`Incident is already "${newStatus}"`);
  if (!(STATUS_FLOW[previousStatus] || []).includes(newStatus)) {
    throw ApiError.badRequest(`Cannot change status from "${previousStatus}" to "${newStatus}"`);
  }
  if (['Resolved', 'Closed'].includes(newStatus) && !notes) {
    throw ApiError.badRequest('Please add response notes when resolving or closing an incident', { notes: 'Response notes are required' });
  }

  incident.status = newStatus;
  if (previousStatus === 'Reported' && !incident.acknowledgedAt) incident.acknowledgedAt = new Date();
  if (newStatus === 'Resolved' || (newStatus === 'Closed' && !incident.resolvedAt)) incident.resolvedAt = new Date();
  if (newStatus === 'In Progress' && previousStatus === 'Resolved') incident.resolvedAt = null;
  if (!incident.assignedTo && req.user.role === 'security' && newStatus !== 'Closed') incident.assignedTo = req.user._id;
  await incident.save();

  const entry = await IncidentHistory.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    action: 'Status Update',
    previousStatus,
    newStatus,
    updatedBy: req.user._id,
    updatedByName: req.user.name,
    notes,
  });

  const escStatus = DONE_STATUSES.includes(newStatus) ? 'Resolved' : 'Acknowledged';
  await Escalation.updateMany(
    { incident: incident._id, escalationStatus: { $in: ['Analyzed', 'Immediate Attention', 'Auto-Escalated', 'Acknowledged'] } },
    { escalationStatus: escStatus }
  );
  await notifyStudent(incident, `Update on ${incident.incidentId}: status changed to "${newStatus}".${notes ? ` Note: ${notes}` : ''}`);
  await logActivity(req.user, 'Updated incident status', `${incident.incidentId}: ${previousStatus} -> ${newStatus}`);

  await incident.populate('assignedTo', 'name email phone');
  ok(res, { incident, history: entry, nextAction: nextActionFor(incident), allowedStatuses: STATUS_FLOW[newStatus] }, 'Status updated');
});

/* ------------------------------------------------------------------ */
/* PATCH /api/incidents/:id/priority  (manual override)                */
/* ------------------------------------------------------------------ */
export const updatePriority = asyncHandler(async (req, res) => {
  const incident = await loadIncident(req.params.id, req.user);
  const { priority } = req.body;
  const reason = clean(req.body.reason, 300);
  const v = new Validator();
  v.required('priority', priority, 'Priority').oneOf('priority', priority, PRIORITIES, 'Priority');
  v.required('reason', reason, 'Reason');
  v.assert();
  if (incident.priority === priority) throw ApiError.badRequest(`Priority is already ${priority}`);

  const prev = incident.priority;
  incident.priority = priority;
  incident.priorityOverridden = true;
  incident.priorityReasons = [...(incident.priorityReasons || []), `Manually changed ${prev} -> ${priority} by ${req.user.name}: ${reason}`];
  await incident.save();
  await IncidentHistory.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    action: 'Priority Change',
    previousStatus: incident.status,
    newStatus: incident.status,
    updatedBy: req.user._id,
    updatedByName: req.user.name,
    notes: `Priority changed from ${prev} to ${priority}. Reason: ${reason}`,
  });
  await logActivity(req.user, 'Changed incident priority', `${incident.incidentId}: ${prev} -> ${priority}`);
  ok(res, { incident, nextAction: nextActionFor(incident) }, 'Priority updated');
});

/* ------------------------------------------------------------------ */
/* PATCH /api/incidents/:id/assign                                      */
/* ------------------------------------------------------------------ */
export const assignIncident = asyncHandler(async (req, res) => {
  const incident = await loadIncident(req.params.id, req.user);
  const { assignedTo } = req.body;
  let officer = null;
  if (assignedTo) {
    if (!mongoose.isValidObjectId(assignedTo)) throw ApiError.badRequest('Invalid officer');
    officer = await User.findOne({ _id: assignedTo, role: { $in: ['security', 'admin'] }, isActive: true });
    if (!officer) throw ApiError.badRequest('Selected officer is not an active security account');
  }
  incident.assignedTo = officer?._id || null;
  await incident.save();
  await IncidentHistory.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    action: 'Assignment',
    previousStatus: incident.status,
    newStatus: incident.status,
    updatedBy: req.user._id,
    updatedByName: req.user.name,
    notes: officer ? `Assigned to ${officer.name}` : 'Assignment removed',
  });
  if (officer) await notifyStudent(incident, `${officer.name} (Campus Security) has been assigned to your report ${incident.incidentId}.`);
  await logActivity(req.user, 'Assigned incident', `${incident.incidentId} -> ${officer?.name || 'unassigned'}`);
  await incident.populate('assignedTo', 'name email phone');
  ok(res, { incident }, officer ? `Assigned to ${officer.name}` : 'Assignment removed');
});

/* ------------------------------------------------------------------ */
/* GET /api/incidents/map  - location markers (staff only)             */
/* ------------------------------------------------------------------ */
export const mapIncidents = asyncHandler(async (req, res) => {
  const filter = { locationShared: true, latitude: { $ne: null }, longitude: { $ne: null } };
  if (req.query.status === 'open') filter.status = { $in: OPEN_STATUSES };
  else if (req.query.status === 'done') filter.status = { $in: DONE_STATUSES };
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.query.category) filter.category = req.query.category;
  const items = await Incident.find(filter)
    .select('incidentId title category categoryName priority status location latitude longitude createdAt isSOS')
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  ok(res, items);
});

/* ------------------------------------------------------------------ */
/* POST /api/incidents/escalations/run  - manual sweep trigger          */
/* ------------------------------------------------------------------ */
export const runEscalations = asyncHandler(async (req, res) => {
  const escalated = await runEscalationSweep({ force: true });
  await logActivity(req.user, 'Ran escalation check', `${escalated.length} incident(s) escalated`);
  ok(res, escalated, escalated.length ? `${escalated.length} incident(s) escalated` : 'No incidents required escalation');
});

/* GET /api/incidents/escalations/recent - escalation feed for dashboards */
export const recentEscalations = asyncHandler(async (_req, res) => {
  await runEscalationSweep();
  const items = await Escalation.find().sort({ createdAt: -1 }).limit(15).lean();
  ok(res, items);
});
