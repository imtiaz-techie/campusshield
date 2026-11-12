/**
 * npm run test:api
 * End-to-end API smoke test against an in-memory MongoDB (never touches real data).
 * Covers auth, contacts, SOS + detailed reports, RBAC, status workflow, priority,
 * assignment, escalation, notifications, analytics and admin endpoints.
 */
import { MongoMemoryServer } from 'mongodb-memory-server-core';
import mongoose from 'mongoose';
import { setDatabaseUri, connectDB } from '../config/db.js';

const mem = await MongoMemoryServer.create();
setDatabaseUri(mem.getUri('campusshield-test'));
const { default: app } = await import('../app.js');
await connectDB(); // auto-seeds the empty database

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
let passed = 0;
let failed = 0;

async function call(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}
function check(name, cond, extra = '') {
  if (cond) { passed += 1; console.log(`  PASS  ${name}`); }
  else { failed += 1; console.log(`  FAIL  ${name} ${extra}`); }
}

try {
  console.log('\nCampusShield API smoke test\n');
  const health = await call('GET', '/health');
  check('health endpoint', health.status === 200);

  // ---- Auth
  const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).json.data?.token;
  const adminT = await login('admin@diu.edu.bd', 'admin123');
  const secT = await login('security@diu.edu.bd', 'security123');
  const stuT = await login('student@diu.edu.bd', 'student123');
  check('seeded accounts can log in', adminT && secT && stuT);
  const bad = await call('POST', '/auth/login', { body: { email: 'student@diu.edu.bd', password: 'wrong' } });
  check('wrong password rejected (401)', bad.status === 401);
  const inj = await call('POST', '/auth/login', { body: { email: { $ne: null }, password: { $ne: null } } });
  check('NoSQL injection login rejected', inj.status === 400 || inj.status === 401);

  const reg = await call('POST', '/auth/register', { body: { name: 'Test Student', studentId: '232-35-999', email: 'test.student@diu.edu.bd', phone: '01799999999', department: 'Software Engineering', password: 'test123', confirmPassword: 'test123' } });
  check('student registration', reg.status === 201 && reg.json.data.user.role === 'student' && !reg.json.data.user.password);
  const regBad = await call('POST', '/auth/register', { body: { name: 'X', studentId: 'abc', email: 'x@gmail.com', phone: '123', password: '1' } });
  check('registration validation errors', regBad.status === 400 && Object.keys(regBad.json.errors || {}).length >= 4);
  const dup = await call('POST', '/auth/register', { body: { name: 'Test Student', studentId: '232-35-999', email: 'test.student@diu.edu.bd', phone: '01799999999', department: 'Software Engineering', password: 'test123' } });
  check('duplicate registration rejected (409)', dup.status === 409);
  const newT = reg.json.data.token;
  const me = await call('GET', '/auth/me', { token: newT });
  check('GET /auth/me', me.json.data.email === 'test.student@diu.edu.bd');

  // ---- Contacts
  const c1 = await call('POST', '/contacts', { token: newT, body: { contactName: 'Mother Test', relationship: 'Mother', phone: '01711112222' } });
  const c2 = await call('POST', '/contacts', { token: newT, body: { contactName: 'Friend Test', relationship: 'Friend', phone: '01811112222' } });
  check('add trusted contacts', c1.status === 201 && c2.status === 201 && c1.json.data.isPrimary);
  const cBad = await call('POST', '/contacts', { token: newT, body: { contactName: 'A', relationship: 'Alien', phone: '12' } });
  check('contact validation', cBad.status === 400);
  const cUp = await call('PUT', `/contacts/${c2.json.data._id}`, { token: newT, body: { contactName: 'Best Friend', relationship: 'Friend', phone: '01811112222' } });
  check('edit contact', cUp.json.data.contactName === 'Best Friend');
  const cOther = await call('DELETE', `/contacts/${c2.json.data._id}`, { token: stuT });
  check('cannot delete another student\'s contact', cOther.status === 404);
  const list = await call('GET', '/contacts', { token: newT });
  check('list contacts', list.json.data.length === 2);
  const secContacts = await call('GET', '/contacts', { token: secT });
  check('security cannot access student contacts API (403)', secContacts.status === 403);

  // ---- Categories
  const cats = await call('GET', '/categories', { token: newT });
  check('8 emergency categories', cats.json.data.length === 8);

  // ---- SOS
  const sos = await call('POST', '/incidents', { token: newT, body: { isSOS: true, category: 'physical-assault', description: 'Someone attacked me near the gate, please help', latitude: 23.8775, longitude: 90.3211, location: 'DIU Main Gate' } });
  check('SOS creates incident', sos.status === 201 && /^CS-\d{4}-\d{4}$/.test(sos.json.data.incident.incidentId));
  check('SOS auto-priority Critical', sos.json.data.analysis.priority === 'Critical');
  check('escalation engine response category', sos.json.data.analysis.responseCategory.startsWith('Immediate Security Intervention'));
  check('contact notifications simulated (2)', sos.json.data.notifications.length === 2);
  const sosId = sos.json.data.incident.incidentId;

  // ---- Detailed report
  const det = await call('POST', '/incidents', { token: newT, body: { title: 'Wallet stolen in library', category: 'theft-robbery', description: 'My wallet was stolen from my bag in the library reading room.', location: 'Central Library', incidentDate: new Date().toISOString(), shareLocation: false, latitude: 23.87, longitude: 90.31, notes: 'Brown leather wallet' } });
  check('detailed report created', det.status === 201);
  check('location privacy respected (coords not stored)', det.json.data.incident.latitude === null && det.json.data.incident.locationShared === false);
  const detBad = await call('POST', '/incidents', { token: newT, body: { title: 'x', category: 'nope', description: 'short' } });
  check('report validation', detBad.status === 400);
  const fut = await call('POST', '/incidents', { token: newT, body: { title: 'Future thing', category: 'other', description: 'This is a description long enough', location: 'Library', incidentDate: new Date(Date.now() + 86400000).toISOString() } });
  check('future date rejected', fut.status === 400);
  const secCreate = await call('POST', '/incidents', { token: secT, body: { isSOS: true, category: 'other', description: 'test test' } });
  check('security cannot submit student reports (403)', secCreate.status === 403);

  // ---- Student views
  const mine = await call('GET', '/incidents', { token: newT });
  check('student sees only own reports', mine.json.data.length === 2);
  const search = await call('GET', `/incidents?q=${sosId}`, { token: newT });
  check('search by incident ID', search.json.data.length === 1);
  const filt = await call('GET', '/incidents?category=theft-robbery&status=Reported', { token: newT });
  check('filter by category + status', filt.json.data.length === 1);
  const someoneElse = await call('GET', `/incidents/${sosId}`, { token: stuT });
  check('student cannot open another student\'s incident (403)', someoneElse.status === 403);

  // ---- Security workflow
  const all = await call('GET', '/incidents?limit=100', { token: secT });
  check('security sees all incidents (>=20)', all.json.meta.total >= 20);
  const studentPatch = await call('PATCH', `/incidents/${sosId}/status`, { token: newT, body: { status: 'Resolved' } });
  check('student cannot update status (403)', studentPatch.status === 403);
  const ack = await call('PATCH', `/incidents/${sosId}/status`, { token: secT, body: { status: 'Acknowledged', notes: 'On it' } });
  check('status -> Acknowledged', ack.status === 200 && ack.json.data.incident.status === 'Acknowledged');
  check('history entry recorded', ack.json.data.history.previousStatus === 'Reported' && ack.json.data.history.newStatus === 'Acknowledged');
  const badFlow = await call('PATCH', `/incidents/${sosId}/status`, { token: secT, body: { status: 'Reported' } });
  check('invalid transition rejected', badFlow.status === 400);
  const noNote = await call('PATCH', `/incidents/${sosId}/status`, { token: secT, body: { status: 'Resolved' } });
  check('resolve requires notes', noNote.status === 400);
  const pr = await call('PATCH', `/incidents/${sosId}/priority`, { token: secT, body: { priority: 'High', reason: 'Verified minor injuries' } });
  check('manual priority override', pr.json.data.incident.priority === 'High' && pr.json.data.incident.priorityOverridden);
  const officers = await call('GET', '/users/officers', { token: secT });
  const asg = await call('PATCH', `/incidents/${sosId}/assign`, { token: secT, body: { assignedTo: officers.json.data[0]._id } });
  check('assign incident to officer', asg.status === 200 && asg.json.data.incident.assignedTo);
  const detail = await call('GET', `/incidents/${sosId}`, { token: newT });
  check('student sees updated status + timeline', detail.json.data.incident.status === 'Acknowledged' && detail.json.data.history.length >= 4);

  // ---- Escalation sweep (seed contains an 18-minute-old unacknowledged critical incident)
  const esc = await call('GET', '/incidents/escalations/recent', { token: secT });
  check('auto-escalation of unacknowledged critical incident', esc.json.data.some((e) => e.escalationStatus === 'Auto-Escalated'));

  // ---- Notifications
  const notes = await call('GET', '/notifications', { token: newT });
  check('student notification history', notes.json.data.length >= 4);
  const readAll = await call('PATCH', '/notifications/read-all', { token: newT });
  check('mark all read', readAll.status === 200);
  const secNotes = await call('GET', '/notifications', { token: secT });
  check('security sees contact-alert simulations', secNotes.json.data.every((n) => n.notificationType === 'Emergency Alert'));

  // ---- Map + analytics
  const map = await call('GET', '/incidents/map', { token: secT });
  check('map returns only shared locations', map.json.data.length >= 18 && map.json.data.every((m) => m.latitude !== null));
  const stuMap = await call('GET', '/incidents/map', { token: newT });
  check('students cannot access location map (403)', stuMap.status === 403);
  const an = await call('GET', '/analytics/summary', { token: adminT });
  check('analytics summary', an.json.data.totals.total >= 20 && an.json.data.monthly.length === 6 && an.json.data.users.students === 11);

  // ---- Admin
  const users = await call('GET', '/users', { token: adminT });
  check('admin lists users', users.json.data.length === 14);
  const secUsers = await call('GET', '/users', { token: secT });
  check('security cannot list users (403)', secUsers.status === 403);
  const nu = await call('POST', '/users', { token: adminT, body: { name: 'New Officer', email: 'officer3@diu.edu.bd', phone: '01700000999', role: 'security', password: 'secure123' } });
  check('admin creates security account', nu.status === 201 && nu.json.data.role === 'security');
  const deact = await call('PUT', `/users/${nu.json.data._id}`, { token: adminT, body: { isActive: false } });
  check('admin deactivates account', deact.json.data.isActive === false);
  const deactLogin = await call('POST', '/auth/login', { body: { email: 'officer3@diu.edu.bd', password: 'secure123' } });
  check('deactivated account cannot log in', deactLogin.status === 403);
  const cat = await call('POST', '/categories', { token: adminT, body: { name: 'Cyber Bullying', icon: 'Phone', color: '#123456', defaultPriority: 'Medium' } });
  check('admin creates category', cat.status === 201 && cat.json.data.key === 'cyber-bullying');
  const delSys = await call('DELETE', `/categories/${cats.json.data[0]._id}`, { token: adminT });
  check('built-in category cannot be deleted', delSys.status === 400);
  const set = await call('PUT', '/admin/settings', { token: adminT, body: { escalationMinutes: 3 } });
  check('admin updates escalation time', set.json.data.escalationMinutes === 3);
  const act = await call('GET', '/admin/activity', { token: adminT });
  check('activity log records actions', act.json.data.length > 10);
  const noAuth = await call('GET', '/incidents');
  check('unauthenticated request rejected (401)', noAuth.status === 401);
} catch (err) {
  failed += 1;
  console.error('Test crashed:', err);
} finally {
  console.log(`\n${passed} passed, ${failed} failed\n`);
  server.close();
  await mongoose.disconnect();
  await mem.stop();
  process.exit(failed ? 1 : 0);
}
