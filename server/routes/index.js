import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as auth from '../controllers/authController.js';
import * as contacts from '../controllers/contactController.js';
import * as categories from '../controllers/categoryController.js';
import * as incidents from '../controllers/incidentController.js';
import * as analytics from '../controllers/analyticsController.js';
import * as notifications from '../controllers/notificationController.js';
import * as admin from '../controllers/adminController.js';

const router = Router();
const staff = authorize('security', 'admin');
const adminOnly = authorize('admin');
const studentOnly = authorize('student');

/* ---------- Auth ---------- */
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);
router.get('/auth/departments', auth.departments);
router.get('/auth/me', protect, auth.me);
router.put('/auth/me', protect, auth.updateProfile);
router.put('/auth/me/password', protect, auth.changePassword);

/* ---------- Trusted emergency contacts (student) ---------- */
router.get('/contacts/relationships', protect, contacts.relationships);
router.get('/contacts', protect, studentOnly, contacts.listContacts);
router.post('/contacts', protect, studentOnly, contacts.createContact);
router.put('/contacts/:id', protect, studentOnly, contacts.updateContact);
router.delete('/contacts/:id', protect, studentOnly, contacts.deleteContact);

/* ---------- Categories ---------- */
router.get('/categories', protect, categories.listCategories);
router.get('/categories/icons', protect, adminOnly, categories.iconList);
router.post('/categories', protect, adminOnly, categories.createCategory);
router.put('/categories/:id', protect, adminOnly, categories.updateCategory);
router.delete('/categories/:id', protect, adminOnly, categories.deleteCategory);

/* ---------- Incidents ---------- */
router.post('/incidents/analyze', protect, incidents.analyzePreview);
router.get('/incidents/map', protect, staff, incidents.mapIncidents);
router.post('/incidents/escalations/run', protect, staff, incidents.runEscalations);
router.get('/incidents/escalations/recent', protect, staff, incidents.recentEscalations);
router.post('/incidents', protect, studentOnly, incidents.createIncident);
router.get('/incidents', protect, incidents.listIncidents);
router.get('/incidents/:id', protect, incidents.getIncident);
router.patch('/incidents/:id/status', protect, staff, incidents.updateStatus);
router.patch('/incidents/:id/priority', protect, staff, incidents.updatePriority);
router.patch('/incidents/:id/assign', protect, staff, incidents.assignIncident);

/* ---------- Analytics ---------- */
router.get('/analytics/summary', protect, staff, analytics.summary);
router.get('/analytics/me', protect, studentOnly, analytics.studentSummary);

/* ---------- Notifications (simulated) ---------- */
router.get('/notifications', protect, notifications.listNotifications);
router.get('/notifications/unread-count', protect, notifications.unreadCount);
router.patch('/notifications/read-all', protect, notifications.markAllRead);
router.patch('/notifications/:id/read', protect, notifications.markRead);

/* ---------- Users & admin ---------- */
router.get('/users/officers', protect, staff, admin.listOfficers);
router.get('/users', protect, adminOnly, admin.listUsers);
router.post('/users', protect, adminOnly, admin.createUser);
router.put('/users/:id', protect, adminOnly, admin.updateUser);
router.delete('/users/:id', protect, adminOnly, admin.deleteUser);
router.get('/admin/activity', protect, adminOnly, admin.activityLog);
router.get('/admin/settings', protect, adminOnly, admin.getSystemSettings);
router.put('/admin/settings', protect, adminOnly, admin.updateSystemSettings);
router.get('/settings/public', protect, admin.publicSettings);

export default router;
