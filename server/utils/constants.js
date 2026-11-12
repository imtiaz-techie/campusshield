export const ROLES = ['student', 'security', 'admin'];

export const STATUSES = ['Reported', 'Acknowledged', 'Response Dispatched', 'In Progress', 'Resolved', 'Closed'];
export const OPEN_STATUSES = ['Reported', 'Acknowledged', 'Response Dispatched', 'In Progress'];
export const ACTIVE_STATUSES = ['Acknowledged', 'Response Dispatched', 'In Progress'];
export const DONE_STATUSES = ['Resolved', 'Closed'];

export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

/** Allowed status transitions (forward workflow, a resolved incident may be re-opened). */
export const STATUS_FLOW = {
  Reported: ['Acknowledged', 'Response Dispatched', 'In Progress', 'Resolved', 'Closed'],
  Acknowledged: ['Response Dispatched', 'In Progress', 'Resolved', 'Closed'],
  'Response Dispatched': ['In Progress', 'Resolved', 'Closed'],
  'In Progress': ['Resolved', 'Closed'],
  Resolved: ['Closed', 'In Progress'],
  Closed: [],
};

export const DEFAULT_CATEGORIES = [
  { key: 'harassment', name: 'Harassment', icon: 'UserX', color: '#DB2777', defaultPriority: 'High',
    responseCategory: 'Security Intervention & Counselling', recommendedAction: 'Dispatch campus security to the location and connect the student with the proctor office / counselling unit.' },
  { key: 'physical-assault', name: 'Physical Assault', icon: 'ShieldAlert', color: '#DC2626', defaultPriority: 'Critical',
    responseCategory: 'Immediate Security Intervention', recommendedAction: 'Dispatch nearby campus security personnel immediately and alert the campus medical team.' },
  { key: 'medical-emergency', name: 'Medical Emergency', icon: 'HeartPulse', color: '#E11D48', defaultPriority: 'High',
    responseCategory: 'Medical Response', recommendedAction: 'Send the campus medical team / ambulance to the location and keep contact with the student.' },
  { key: 'theft-robbery', name: 'Theft or Robbery', icon: 'Wallet', color: '#F59E0B', defaultPriority: 'Medium',
    responseCategory: 'Security Investigation', recommendedAction: 'Send a security officer to record a statement, check CCTV footage and secure the area.' },
  { key: 'fire-emergency', name: 'Fire Emergency', icon: 'Flame', color: '#EA580C', defaultPriority: 'Critical',
    responseCategory: 'Fire & Evacuation Response', recommendedAction: 'Trigger building evacuation, alert the fire service and dispatch the fire safety team.' },
  { key: 'accident', name: 'Accident', icon: 'CarFront', color: '#7C3AED', defaultPriority: 'High',
    responseCategory: 'Medical & Traffic Response', recommendedAction: 'Dispatch security and the first-aid team; secure the accident area and manage traffic.' },
  { key: 'suspicious-activity', name: 'Suspicious Activity', icon: 'Eye', color: '#0891B2', defaultPriority: 'Medium',
    responseCategory: 'Security Patrol', recommendedAction: 'Send a patrol unit to observe and verify; review CCTV around the reported area.' },
  { key: 'other', name: 'Other Emergency', icon: 'AlertCircle', color: '#64748B', defaultPriority: 'Low',
    responseCategory: 'General Assistance', recommendedAction: 'Contact the student to gather more details and assign the nearest available officer.' },
];

/** Mock (simulated) locations around DIU Smart City, Ashulia. Real GPS is never used. */
export const CAMPUS_LOCATIONS = [
  { name: 'DIU Main Gate', lat: 23.87755, lng: 90.32118 },
  { name: 'Knowledge Tower', lat: 23.87664, lng: 90.32026 },
  { name: 'Central Library', lat: 23.87612, lng: 90.31972 },
  { name: 'Inspiration Building', lat: 23.87582, lng: 90.32098 },
  { name: 'Food Court', lat: 23.87693, lng: 90.31906 },
  { name: 'Female Dormitory', lat: 23.87481, lng: 90.32182 },
  { name: 'Male Dormitory', lat: 23.87455, lng: 90.3189 },
  { name: 'Sports Ground', lat: 23.87808, lng: 90.31855 },
  { name: 'Bus Stand (Transport Pool)', lat: 23.87862, lng: 90.32241 },
  { name: 'Parking Area', lat: 23.87721, lng: 90.32301 },
];
