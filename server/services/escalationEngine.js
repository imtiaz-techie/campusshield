/**
 * CampusShield rule-based Emergency Escalation Engine (no external AI required).
 *
 *  1. Receives a newly submitted report
 *  2. Analyzes its category + description (keyword rules)
 *  3. Determines the response category
 *  4. Calculates the priority
 *  5. Recommends the next response action
 *  6. Output is stored on the incident + Escalations collection and shown to security
 *  7. Unacknowledged critical incidents are auto-escalated after a configurable time
 *  8. Every escalation is written to IncidentHistory
 */
import Incident from '../models/Incident.js';
import Escalation from '../models/Escalation.js';
import IncidentHistory from '../models/IncidentHistory.js';
import Notification from '../models/Notification.js';
import { getSettings } from '../models/misc.js';

const LEVELS = ['Low', 'Medium', 'High', 'Critical'];
const rank = (p) => LEVELS.indexOf(p);
const raise = (p, steps = 1) => LEVELS[Math.min(LEVELS.length - 1, Math.max(0, rank(p) + steps))];
const atLeast = (p, min) => (rank(p) >= rank(min) ? p : min);

/** Keyword groups: words found in the description that change priority / response. */
const RULES = {
  critical: [
    'weapon', 'knife', 'gun', 'pistol', 'stab', 'bleeding', 'blood', 'unconscious', 'not breathing',
    'heart attack', 'seizure', 'collapsed', 'explosion', 'smoke', 'burning', 'kidnap', 'abduct',
    'sexual assault', 'rape', 'attacked', 'beaten', 'trapped', 'severe',
  ],
  high: [
    'injured', 'injury', 'hurt', 'following me', 'followed', 'stalk', 'threat', 'chasing', 'chased',
    'grabbed', 'touched', 'drunk', 'fight', 'fainted', 'faint', 'pain', 'broken', 'scared', 'help',
    'alone', 'dark', 'urgent',
  ],
  low: ['inquiry', 'question', 'lost item', 'information', 'minor', 'not urgent'],
  medical: ['bleeding', 'blood', 'unconscious', 'injured', 'injury', 'hurt', 'faint', 'fainted', 'pain', 'heart', 'seizure', 'breathing', 'collapsed', 'broken'],
  fire: ['fire', 'smoke', 'burning', 'explosion', 'gas leak'],
  police: ['weapon', 'knife', 'gun', 'pistol', 'kidnap', 'abduct', 'robbed', 'mugged'],
};

const findWords = (text, words) => words.filter((w) => text.includes(w));

const TARGET_MINUTES = { Critical: 2, High: 5, Medium: 15, Low: 60 };

export const ESCALATION_LEVELS = [
  'On-duty Security Officer',
  'Duty Supervisor',
  'Chief Security Officer',
  'Proctor Office & External Emergency Services',
];

/** Step 2-4: classify priority with explainable reasons. */
export function classifyPriority({ category, description = '', title = '', isSOS = false, incidentDate }) {
  const text = `${title} ${description}`.toLowerCase();
  const reasons = [];
  let priority = category?.defaultPriority || 'Medium';
  reasons.push(`Category "${category?.name || 'Unknown'}" default priority: ${priority}`);

  const crit = findWords(text, RULES.critical);
  const high = findWords(text, RULES.high);
  const low = findWords(text, RULES.low);

  if (crit.length) {
    priority = 'Critical';
    reasons.push(`Critical keywords detected: ${crit.slice(0, 4).join(', ')}`);
  } else if (high.length) {
    // Risk words raise priority by one level, but only critical keywords can reach Critical.
    if (rank(priority) < rank('High')) {
      priority = raise(priority, 1);
      reasons.push(`Risk keywords detected (${high.slice(0, 3).join(', ')}): raised to ${priority}`);
    }
  } else if (low.length && rank(priority) <= rank('Medium')) {
    priority = 'Low';
    reasons.push(`Non-urgent wording detected (${low[0]}): set to Low`);
  }

  if (isSOS && rank(priority) < rank('High')) {
    priority = 'High';
    reasons.push('Triggered through the SOS button: minimum High priority');
  }

  const hour = new Date(incidentDate || Date.now()).getHours();
  if ((hour >= 22 || hour < 5) && rank(priority) < rank('High') && !low.length) {
    priority = raise(priority, 1);
    reasons.push(`Reported during late hours (${String(hour).padStart(2, '0')}:00): raised to ${priority}`);
  }

  return { priority, reasons };
}

/** Steps 3 + 5: decide response category and the recommended action plan. */
export function analyzeIncident(input) {
  const { category } = input;
  const text = `${input.title || ''} ${input.description || ''}`.toLowerCase();
  const { priority, reasons } = classifyPriority(input);

  let responseCategory = category?.responseCategory || 'General Assistance';
  const extraSteps = [];
  if (findWords(text, RULES.fire).length && category?.key !== 'fire-emergency') {
    responseCategory = 'Fire & Evacuation Response';
    extraSteps.push('Alert fire safety team and prepare evacuation');
  }
  if (findWords(text, RULES.medical).length && !/medical/i.test(responseCategory)) {
    extraSteps.push('Send campus medical / first-aid team');
    if (priority === 'Critical') responseCategory = `${responseCategory} + Medical Support`;
  }
  if (findWords(text, RULES.police).length) {
    extraSteps.push('Inform local police station (simulated)');
  }

  const baseAction = category?.recommendedAction || 'Assign the nearest available officer.';
  const recommendedAction = priority === 'Critical' ? `IMMEDIATE: ${baseAction}` : baseAction;

  const target = TARGET_MINUTES[priority];
  const nextSteps = [
    `Acknowledge within ${target} minute${target > 1 ? 's' : ''}`,
    baseAction,
    ...extraSteps,
    priority === 'Critical' ? 'Notify the duty supervisor and keep contact with the student' : 'Contact the student to confirm details',
    'Update status and add response notes when the situation changes',
  ];

  return {
    priority,
    reasons,
    responseCategory,
    recommendedAction,
    nextSteps,
    targetMinutes: target,
    escalationStatus: priority === 'Critical' ? 'Immediate Attention' : 'Analyzed',
    escalationMessage:
      priority === 'Critical' ? 'Immediate attention required.' : priority === 'High' ? 'Prompt response required.' : 'Standard response queue.',
  };
}

/** Context-aware "what should security do next" for the current status. */
export function nextActionFor(incident) {
  switch (incident.status) {
    case 'Reported':
      return `Acknowledge the report now (target: ${TARGET_MINUTES[incident.priority]} min) and review the location.`;
    case 'Acknowledged':
      return `Dispatch response: ${incident.recommendedAction || 'assign an officer'}`;
    case 'Response Dispatched':
      return 'Confirm the team has reached the student, then mark as In Progress.';
    case 'In Progress':
      return 'Mark as Resolved once the student is safe; record response notes.';
    case 'Resolved':
      return 'Follow up with the student and close the incident.';
    default:
      return 'No further action required. Incident closed.';
  }
}

/** Persist the analysis for a newly created incident (Escalations collection + history). */
export async function recordInitialEscalation(incident, analysis) {
  await Escalation.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    priority: analysis.priority,
    responseCategory: analysis.responseCategory,
    recommendedAction: analysis.recommendedAction,
    escalationStatus: analysis.escalationStatus,
    level: 0,
    reasons: analysis.reasons,
    nextSteps: analysis.nextSteps,
  });
  await IncidentHistory.create({
    incident: incident._id,
    incidentId: incident.incidentId,
    action: 'Escalation',
    newStatus: incident.status,
    updatedByName: 'Escalation Engine',
    notes: `Auto-analysis: ${analysis.priority} priority | ${analysis.responseCategory}. ${analysis.escalationMessage}`,
  });
}

/* ---------- Step 7: auto-escalate unacknowledged critical incidents ---------- */
let lastSweep = 0;

export async function runEscalationSweep({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastSweep < 10_000) return [];
  lastSweep = now;

  const settings = await getSettings();
  if (!settings.autoEscalation) return [];
  const windowMs = settings.escalationMinutes * 60_000;
  const maxLevel = ESCALATION_LEVELS.length - 1;

  const candidates = await Incident.find({
    priority: 'Critical',
    status: 'Reported',
    escalationLevel: { $lt: maxLevel },
  }).lean();

  const escalated = [];
  for (const inc of candidates) {
    const due = new Date(inc.createdAt).getTime() + windowMs * (inc.escalationLevel + 1);
    if (now < due) continue;
    const newLevel = inc.escalationLevel + 1;
    // Conditional update prevents double escalation when sweeps overlap.
    const updated = await Incident.findOneAndUpdate(
      { _id: inc._id, escalationLevel: inc.escalationLevel, status: 'Reported' },
      { $set: { escalationLevel: newLevel, escalated: true } },
      { new: true }
    );
    if (!updated) continue;
    const target = ESCALATION_LEVELS[newLevel];
    const mins = Math.round((now - new Date(inc.createdAt).getTime()) / 60000);
    await Escalation.create({
      incident: inc._id,
      incidentId: inc.incidentId,
      priority: inc.priority,
      responseCategory: inc.responseCategory || 'Immediate Security Intervention',
      recommendedAction: `Escalated to ${target}. ${inc.recommendedAction}`,
      escalationStatus: 'Auto-Escalated',
      level: newLevel,
      reasons: [`Critical incident not acknowledged for ${mins} minute(s) (threshold: ${settings.escalationMinutes} min per level)`],
      nextSteps: [`${target} must acknowledge immediately`, inc.recommendedAction],
    });
    await IncidentHistory.create({
      incident: inc._id,
      incidentId: inc.incidentId,
      action: 'Escalation',
      previousStatus: inc.status,
      newStatus: inc.status,
      updatedByName: 'Escalation Engine',
      notes: `Auto-escalated to Level ${newLevel} (${target}): not acknowledged within ${settings.escalationMinutes * newLevel} min. Supervisor alert simulated.`,
    });
    await Notification.create({
      incident: inc._id,
      incidentId: inc.incidentId,
      recipientUser: inc.studentId,
      channel: 'In-App',
      notificationType: 'Escalation',
      notificationStatus: 'Delivered',
      deliveredAt: new Date(),
      message: `Your report ${inc.incidentId} has been escalated to the ${target} for faster response.`,
    });
    escalated.push({ incidentId: inc.incidentId, level: newLevel, target });
  }
  return escalated;
}

/* ---------- Emergency contact notification SIMULATION ---------- */
export async function simulateContactNotifications(incident, student, contacts) {
  const time = new Date(incident.createdAt || Date.now()).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' });
  const where = incident.locationShared && incident.latitude != null
    ? `${incident.location || 'campus'} (${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)})`
    : incident.location || 'location not shared';
  if (!contacts.length) {
    return [
      await Notification.create({
        incident: incident._id,
        incidentId: incident.incidentId,
        recipientUser: student._id,
        channel: 'In-App',
        notificationType: 'System',
        notificationStatus: 'Delivered',
        deliveredAt: new Date(),
        message: 'No trusted contacts found, so no contact alerts were simulated. Add contacts in Emergency Contacts.',
      }),
    ];
  }
  const docs = contacts.map((c) => ({
    incident: incident._id,
    incidentId: incident.incidentId,
    recipientUser: student._id,
    contactId: c._id,
    contactName: c.contactName,
    contactPhone: c.phone,
    channel: 'SMS',
    notificationType: 'Emergency Alert',
    notificationStatus: 'Sent',
    message: `[SIMULATED] CampusShield: ${student.name} reported "${incident.categoryName}" at ${where} on ${time}. Ref ${incident.incidentId}. Campus security has been alerted.`,
  }));
  return Notification.insertMany(docs);
}

/** Simulated delivery: "Sent" notifications become "Delivered" after ~8 seconds. */
export async function advanceSimulatedDeliveries() {
  const cutoff = new Date(Date.now() - 8000);
  await Notification.updateMany(
    { notificationStatus: 'Sent', createdAt: { $lte: cutoff } },
    [{ $set: { notificationStatus: 'Delivered', deliveredAt: { $add: ['$createdAt', 8000] } } }]
  );
}
