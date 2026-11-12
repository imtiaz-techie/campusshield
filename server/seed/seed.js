/**
 * Demo data for CampusShield. All people, phone numbers and coordinates are fictional.
 * Coordinates are mock points around DIU Smart City (no real student location data).
 */
import mongoose from 'mongoose';
import User from '../models/User.js';
import EmergencyContact from '../models/EmergencyContact.js';
import Incident from '../models/Incident.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Escalation from '../models/Escalation.js';
import Notification from '../models/Notification.js';
import { Category, Counter, Setting, ActivityLog, nextIncidentId } from '../models/misc.js';
import { DEFAULT_CATEGORIES, CAMPUS_LOCATIONS, STATUSES } from '../utils/constants.js';
import { analyzeIncident } from '../services/escalationEngine.js';

export const DEMO_PASSWORDS = { student: 'student123', security: 'security123', admin: 'admin123' };

const STUDENTS = [
  { name: 'Ayesha Rahman', studentId: '221-35-101', email: 'student@diu.edu.bd', phone: '01711000101', department: 'Software Engineering' },
  { name: 'Tanvir Hasan', studentId: '221-35-102', email: 'tanvir@diu.edu.bd', phone: '01811000102', department: 'Software Engineering' },
  { name: 'Nusrat Jahan', studentId: '222-15-103', email: 'nusrat@diu.edu.bd', phone: '01911000103', department: 'Computer Science & Engineering' },
  { name: 'Rakib Ahmed', studentId: '222-15-104', email: 'rakib@diu.edu.bd', phone: '01611000104', department: 'Computer Science & Engineering' },
  { name: 'Farzana Akter', studentId: '231-11-105', email: 'farzana@diu.edu.bd', phone: '01511000105', department: 'Business Administration' },
  { name: 'Mehedi Hasan', studentId: '231-33-106', email: 'mehedi@diu.edu.bd', phone: '01311000106', department: 'Electrical & Electronic Engineering' },
  { name: 'Sadia Islam', studentId: '232-35-107', email: 'sadia@diu.edu.bd', phone: '01411000107', department: 'Software Engineering' },
  { name: 'Arif Chowdhury', studentId: '232-40-108', email: 'arif@diu.edu.bd', phone: '01711000108', department: 'Multimedia & Creative Technology' },
  { name: 'Mim Sultana', studentId: '241-20-109', email: 'mim@diu.edu.bd', phone: '01811000109', department: 'English' },
  { name: 'Shakil Mahmud', studentId: '241-35-110', email: 'shakil@diu.edu.bd', phone: '01911000110', department: 'Software Engineering' },
];

const SECURITY = [
  { name: 'Officer Kamal Uddin', email: 'security@diu.edu.bd', phone: '01700000201', department: 'Campus Security' },
  { name: 'Officer Rina Begum', email: 'security2@diu.edu.bd', phone: '01800000202', department: 'Campus Security' },
];
const ADMIN = { name: 'System Administrator', email: 'admin@diu.edu.bd', phone: '01900000301', department: 'IT Administration' };

const CONTACTS = [
  ['Rashida Rahman', 'Mother', '01712340001'], ['Abdur Rahman', 'Father', '01812340002'],
  ['Hasan Ali', 'Father', '01912340003'], ['Shirin Akter', 'Mother', '01612340004'],
  ['Karim Jahan', 'Sibling', '01512340005'], ['Lima Khatun', 'Friend', '01312340006'],
  ['Selina Ahmed', 'Mother', '01412340007'], ['Jamal Akter', 'Guardian', '01712340008'],
  ['Rubina Hasan', 'Mother', '01812340009'], ['Imran Islam', 'Sibling', '01912340010'],
  ['Nadia Chowdhury', 'Relative', '01612340011'], ['Sumon Sultana', 'Father', '01512340012'],
  ['Parvez Mahmud', 'Sibling', '01312340013'], ['Tania Rahman', 'Roommate', '01412340014'],
];

/* [studentIdx, categoryKey, title, description, locationIdx, daysAgo, hour, finalStatus, officerIdx, isSOS] */
const INCIDENTS = [
  [0, 'harassment', 'Being followed near the bus stand', 'A man has been following me from the bus stand towards the main gate for 10 minutes. I feel scared.', 8, 165, 19, 'Closed', 0, false],
  [1, 'theft-robbery', 'Laptop stolen from library', 'My laptop bag was stolen from the 3rd floor reading area while I went to get a book.', 2, 150, 14, 'Closed', 1, false],
  [2, 'medical-emergency', 'Student fainted in classroom', 'A classmate fainted during the lab class and is not responding properly. Need medical help.', 1, 132, 11, 'Resolved', 0, false],
  [3, 'suspicious-activity', 'Unknown person checking bikes', 'An unknown person was checking motorbike locks in the parking area for a long time.', 9, 118, 17, 'Closed', 1, false],
  [4, 'accident', 'Bike accident at campus road', 'Two motorbikes collided near the parking area. One student injured his leg.', 9, 101, 9, 'Resolved', 0, false],
  [5, 'fire-emergency', 'Smoke from food court kitchen', 'Heavy smoke is coming out of the food court kitchen area, people are leaving.', 4, 88, 13, 'Closed', 1, false],
  [6, 'harassment', 'Verbal harassment at hall corridor', 'Some senior students were verbally harassing juniors in the dormitory corridor.', 5, 74, 21, 'Resolved', 0, false],
  [7, 'theft-robbery', 'Phone snatched at main gate', 'My phone was snatched by a person on a motorbike right outside the main gate.', 0, 60, 18, 'In Progress', 1, true],
  [8, 'other', 'Lost student ID card', 'Lost my ID card somewhere between the library and food court. General inquiry about lost item.', 4, 45, 12, 'Closed', 0, false],
  [9, 'physical-assault', 'Fight between students at sports ground', 'A fight broke out after a football match. One student was beaten and is bleeding from the nose.', 7, 33, 16, 'Resolved', 0, true],
  [0, 'suspicious-activity', 'Suspicious bag near Knowledge Tower', 'An unattended black bag has been lying near the Knowledge Tower entrance for an hour.', 1, 21, 10, 'Response Dispatched', 1, false],
  [2, 'medical-emergency', 'Severe allergic reaction', 'My friend is having a severe allergic reaction after eating at the food court, face is swelling.', 4, 12, 15, 'In Progress', 0, true],
  [3, 'accident', 'Slipped on wet stairs', 'A student slipped on the wet stairs of the Inspiration Building and hurt her ankle.', 3, 6, 10, 'Acknowledged', 1, false],
  [4, 'harassment', 'Harassing messages from a stranger near dorm', 'A stranger near the female dormitory gate made threatening comments and tried to take photos.', 5, 3, 22, 'Acknowledged', null, true],
  [5, 'theft-robbery', 'Wallet missing from locker', 'My wallet was taken from the sports locker room while I was playing.', 7, 2, 17, 'Reported', null, false],
  [6, 'suspicious-activity', 'Drone flying over female dormitory', 'Someone is flying a drone over the female dormitory late in the evening.', 5, 1, 20, 'Reported', null, false],
  [9, 'physical-assault', 'Student attacked near university gate', 'A student reports being physically attacked near the university gate by two outsiders.', 0, 0, null, 'Reported', null, true],
  [1, 'fire-emergency', 'Electrical sparks in lab', 'Electrical sparks and a burning smell from a socket in the computer lab.', 1, 0, null, 'Reported', null, false],
];

const RESPONSE_NOTES = {
  Acknowledged: 'Report received, officer reviewing the location.',
  'Response Dispatched': 'Patrol team dispatched to the location.',
  'In Progress': 'Team on site and handling the situation.',
  Resolved: 'Situation handled. Student is safe and statement recorded.',
  Closed: 'Follow-up completed with the student. Case closed.',
};

async function createDemoData() {
  await Setting.create({ _id: 'system' });
  const categories = await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, isSystem: true })));
  const catByKey = Object.fromEntries(categories.map((c) => [c.key, c.toObject()]));

  // create() runs the bcrypt pre-save hook
  const students = [];
  for (const s of STUDENTS) students.push(await User.create({ ...s, password: DEMO_PASSWORDS.student, role: 'student' }));
  const officers = [];
  for (const s of SECURITY) officers.push(await User.create({ ...s, password: DEMO_PASSWORDS.security, role: 'security' }));
  const admin = await User.create({ ...ADMIN, password: DEMO_PASSWORDS.admin, role: 'admin' });

  const contactsByStudent = {};
  const contactDocs = [];
  students.forEach((s, i) => {
    const picks = i === 0 ? [CONTACTS[0], CONTACTS[1], CONTACTS[5]] : [CONTACTS[(i + 1) % CONTACTS.length], CONTACTS[(i + 4) % CONTACTS.length]];
    picks.forEach(([contactName, relationship, phone], j) => contactDocs.push({ userId: s._id, contactName, relationship, phone, isPrimary: j === 0 }));
  });
  const savedContacts = await EmergencyContact.insertMany(contactDocs);
  savedContacts.forEach((c) => { (contactsByStudent[c.userId] ||= []).push(c); });

  const now = Date.now();
  for (const [sIdx, catKey, title, description, locIdx, daysAgo, hour, finalStatus, offIdx, isSOS] of INCIDENTS) {
    const student = students[sIdx];
    const cat = catByKey[catKey];
    const loc = CAMPUS_LOCATIONS[locIdx];
    let created;
    if (hour === null) {
      created = new Date(now - (catKey === 'physical-assault' ? 18 : 2) * 60_000); // live demo items
    } else {
      created = new Date(now - daysAgo * 86_400_000);
      created.setHours(hour, (sIdx * 7) % 60, 0, 0);
    }
    const analysis = analyzeIncident({ category: cat, title, description, isSOS, incidentDate: created });
    const officer = offIdx === null ? null : officers[offIdx];
    const jitter = () => (Math.random() - 0.5) * 0.0006;

    const path = STATUSES.slice(0, STATUSES.indexOf(finalStatus) + 1);
    const respMin = { Critical: 2, High: 4, Medium: 9, Low: 25 }[analysis.priority] + (sIdx % 4);
    const times = path.map((_, k) => new Date(created.getTime() + (k === 0 ? 0 : respMin * 60_000 * (k === 1 ? 1 : k * 4))));

    const incident = await Incident.create({
      incidentId: await nextIncidentId(created),
      studentId: student._id,
      title,
      category: cat.key,
      categoryName: cat.name,
      description,
      location: loc.name,
      latitude: +(loc.lat + jitter()).toFixed(6),
      longitude: +(loc.lng + jitter()).toFixed(6),
      locationShared: true,
      incidentDate: created,
      isSOS,
      priority: analysis.priority,
      priorityReasons: analysis.reasons,
      responseCategory: analysis.responseCategory,
      recommendedAction: analysis.recommendedAction,
      status: finalStatus,
      assignedTo: officer?._id || null,
      acknowledgedAt: path.length > 1 ? times[1] : null,
      resolvedAt: ['Resolved', 'Closed'].includes(finalStatus) ? times[path.indexOf('Resolved')] : null,
      createdAt: created,
      updatedAt: times[times.length - 1],
    });

    const history = [
      { action: 'Created', newStatus: 'Reported', updatedBy: student._id, updatedByName: student.name, notes: isSOS ? 'SOS emergency triggered by student' : 'Incident report submitted', createdAt: created },
      { action: 'Escalation', newStatus: 'Reported', updatedByName: 'Escalation Engine', notes: `Auto-analysis: ${analysis.priority} priority | ${analysis.responseCategory}. ${analysis.escalationMessage}`, createdAt: new Date(created.getTime() + 1000) },
    ];
    if (officer && path.length > 1) {
      history.push({ action: 'Assignment', previousStatus: 'Reported', newStatus: 'Reported', updatedBy: officers[0]._id, updatedByName: officers[0].name, notes: `Assigned to ${officer.name}`, createdAt: new Date(times[1].getTime() - 30_000) });
    }
    for (let k = 1; k < path.length; k += 1) {
      const by = officer || officers[0];
      history.push({ action: 'Status Update', previousStatus: path[k - 1], newStatus: path[k], updatedBy: by._id, updatedByName: by.name, notes: RESPONSE_NOTES[path[k]], createdAt: times[k] });
    }
    await IncidentHistory.insertMany(history.map((h) => ({ ...h, incident: incident._id, incidentId: incident.incidentId })));

    await Escalation.create({
      incident: incident._id, incidentId: incident.incidentId, priority: analysis.priority,
      responseCategory: analysis.responseCategory, recommendedAction: analysis.recommendedAction,
      escalationStatus: path.length === 1 ? analysis.escalationStatus : ['Resolved', 'Closed'].includes(finalStatus) ? 'Resolved' : 'Acknowledged',
      level: 0, reasons: analysis.reasons, nextSteps: analysis.nextSteps, createdAt: created,
    });

    const notes = (contactsByStudent[student._id] || []).map((c) => ({
      incident: incident._id, incidentId: incident.incidentId, recipientUser: student._id, contactId: c._id,
      contactName: c.contactName, contactPhone: c.phone, channel: 'SMS', notificationType: 'Emergency Alert',
      notificationStatus: 'Delivered', deliveredAt: new Date(created.getTime() + 8000), read: daysAgo > 2,
      message: `[SIMULATED] CampusShield: ${student.name} reported "${cat.name}" at ${loc.name} on ${created.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}. Ref ${incident.incidentId}. Campus security has been alerted.`,
      createdAt: new Date(created.getTime() + 2000),
    }));
    for (let k = 1; k < path.length; k += 1) {
      notes.push({
        incident: incident._id, incidentId: incident.incidentId, recipientUser: student._id, channel: 'In-App',
        notificationType: 'Status Update', notificationStatus: 'Delivered', deliveredAt: times[k], read: daysAgo > 2,
        message: `Update on ${incident.incidentId}: status changed to "${path[k]}". Note: ${RESPONSE_NOTES[path[k]]}`, createdAt: times[k],
      });
    }
    await Notification.insertMany(notes);
  }

  await ActivityLog.insertMany([
    { user: admin._id, userName: admin.name, role: 'admin', action: 'Seeded demo data', details: 'Demo accounts, incidents and contacts created' },
  ]);
  return { students: students.length, security: officers.length, admins: 1, incidents: INCIDENTS.length, contacts: savedContacts.length };
}

/** Reset every collection and insert fresh demo data. */
export async function seedAll() {
  const models = [User, EmergencyContact, Incident, IncidentHistory, Escalation, Notification, Category, Counter, Setting, ActivityLog];
  await Promise.all(models.map((m) => m.deleteMany({})));
  await Promise.all(models.map((m) => m.syncIndexes().catch(() => {})));
  return createDemoData();
}

/** Seed only on a brand-new database (used for the first Vercel request). */
export async function seedIfEmpty() {
  if (mongoose.connection.readyState !== 1) return null;
  const users = await User.estimatedDocumentCount();
  if (users > 0) {
    // Make sure categories / settings exist even if users were created manually
    if ((await Category.estimatedDocumentCount()) === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES.map((c) => ({ ...c, isSystem: true })));
    }
    return null;
  }
  console.log('[CampusShield] Empty database detected: seeding demo data...');
  const result = await seedAll();
  console.log('[CampusShield] Seed complete', result);
  return result;
}
