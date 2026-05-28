import { UserProfile, AccessRequest, Classroom, Subject, Schedule, InstructorAvailability, Enrollment } from './types';

// Standard storage keys
const USERS_KEY = 'ssct_users';
const REQUESTS_KEY = 'ssct_requests';
const CLASSROOMS_KEY = 'ssct_classrooms';
const SUBJECTS_KEY = 'ssct_subjects';
const SCHEDULES_KEY = 'ssct_schedules';
const AVAILABILITY_KEY = 'ssct_availability';
const ENROLLMENTS_KEY = 'ssct_enrollments';
const LOCKOUTS_KEY = 'ssct_lockouts';
const SESSION_KEY = 'ssct_session';

// Helper to get from LocalStorage
function getStorage<T>(key: string, defaultValue: T): T {
  const data = localStorage.getItem(key);
  if (!data) return defaultValue;
  try {
    return JSON.parse(data) as T;
  } catch {
    return defaultValue;
  }
}

// Helper to set to LocalStorage and asynchronously sync with Express backend database
function setStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  // Fire-and-forget sync to robust Django-inspired persistent file database
  if (typeof window !== 'undefined' && window.fetch) {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    }).catch(err => console.warn('Offline-first client cached, sync postponed:', err));
  }
}

// Initial Data Seeds
const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin-1',
    email: 'admin@ssct.edu.ph',
    fullName: 'Admin Classroom Tracker',
    role: 'admin',
    isApproved: true,
    mustChangePassword: true,
    passwordHash: 'Admin@123', // Initial temp password
    status: 'active',
  },
  {
    id: 'admin-2',
    email: 'admin2@ssct.edu.ph',
    fullName: 'System Admin (Immediate Access)',
    role: 'admin',
    isApproved: true,
    mustChangePassword: false, // Does not force password change - immediate login
    passwordHash: 'Admin@123',
    status: 'active',
  },
  {
    id: 'instructor-1',
    email: 'instructor@ssct.edu.ph',
    fullName: 'Dr. Evelyn Garcia',
    role: 'instructor',
    isApproved: true,
    mustChangePassword: true,
    passwordHash: 'Instructor@123',
    status: 'active',
    approvedBy: 'admin-1',
    approvedAt: new Date().toISOString(),
  },
  {
    id: 'student-1',
    email: 'student@ssct.edu.ph',
    fullName: 'Marcus Aurelius',
    role: 'student',
    isApproved: true,
    mustChangePassword: true,
    passwordHash: 'Student@123',
    status: 'active',
    approvedBy: 'admin-1',
    approvedAt: new Date().toISOString(),
  }
];

const INITIAL_REQUESTS: AccessRequest[] = [
  {
    id: 'req-1',
    fullName: 'Prof. Roberto Ramos',
    email: 'rramos@ssct.edu.ph',
    role: 'instructor',
    reason: 'Need access to arrange schedules for Advanced Mechatronics and Robotics laboratory classes.',
    status: 'pending',
    requestedAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: 'req-2',
    fullName: 'Samantha Alcantara',
    email: 'salcantara@ssct.edu.ph',
    role: 'student',
    reason: 'To check available computer laboratory schedules for IT students during self-study hours.',
    status: 'pending',
    requestedAt: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'req-3',
    fullName: 'Rejected Applicant',
    email: 'rejected@ssct.edu.ph',
    role: 'student',
    reason: 'Testing access request system rejections.',
    status: 'rejected',
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
    reviewedBy: 'admin-1',
    reviewedAt: new Date(Date.now() - 3600000 * 23).toISOString(),
  }
];

const INITIAL_CLASSROOMS: Classroom[] = [
  { id: 'room-1', name: 'Computer Lab 301', building: 'COE Building', capacity: 40 },
  { id: 'room-2', name: 'Lecture Hall Room 102', building: 'Main Building', capacity: 60 },
  { id: 'room-3', name: 'Drafting Lab 404', building: 'Engineering Complex', capacity: 35 },
  { id: 'room-4', name: 'Chemistry Lab Room 205', building: 'Science Wing', capacity: 30 }
];

const INITIAL_SUBJECTS: Subject[] = [
  { id: 'sub-1', code: 'IT-311', name: 'Web Development Technologies', instructorId: 'instructor-1' },
  { id: 'sub-2', code: 'CS-412', name: 'Artificial Intelligence & Machine Learning', instructorId: 'instructor-1' },
  { id: 'sub-3', code: 'ENG-101', name: 'Technical Communications', instructorId: 'instructor-1' }
];

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 'sched-1',
    subjectId: 'sub-1',
    classroomId: 'room-1',
    instructorId: 'instructor-1',
    dayOfWeek: 'Monday',
    startTime: '08:30',
    endTime: '11:30'
  },
  {
    id: 'sched-2',
    subjectId: 'sub-2',
    classroomId: 'room-1',
    instructorId: 'instructor-1',
    dayOfWeek: 'Wednesday',
    startTime: '13:00',
    endTime: '16:00'
  },
  {
    id: 'sched-3',
    subjectId: 'sub-3',
    classroomId: 'room-2',
    instructorId: 'instructor-1',
    dayOfWeek: 'Tuesday',
    startTime: '10:00',
    endTime: '12:00'
  }
];

const INITIAL_AVAILABILITY: InstructorAvailability[] = [
  { id: 'avail-1', instructorId: 'instructor-1', dayOfWeek: 'Monday', startTime: '08:00', endTime: '12:00', isAvailable: true },
  { id: 'avail-2', instructorId: 'instructor-1', dayOfWeek: 'Wednesday', startTime: '13:00', endTime: '17:00', isAvailable: true },
  { id: 'avail-3', instructorId: 'instructor-1', dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '15:00', isAvailable: true }
];

const INITIAL_ENROLLMENTS: Enrollment[] = [
  { id: "enr-1", studentId: "student-1", subjectId: "sub-1" },
  { id: "enr-2", studentId: "student-1", subjectId: "sub-2" }
];

export interface LockoutRecord {
  email: string;
  failedCount: number;
  lockedUntil: string | null;
}

// Database initializer
export function initializeDB(): void {
  if (!localStorage.getItem(USERS_KEY)) {
    setStorage(USERS_KEY, INITIAL_USERS);
  } else {
    const existingUsers = getStorage<UserProfile[]>(USERS_KEY, []);
    if (!existingUsers.some(u => u.email.toLowerCase() === 'admin2@ssct.edu.ph')) {
      const admin2: UserProfile = {
        id: 'admin-2',
        email: 'admin2@ssct.edu.ph',
        fullName: 'System Admin (Immediate Access)',
        role: 'admin',
        isApproved: true,
        mustChangePassword: false,
        passwordHash: 'Admin@123',
        status: 'active',
      };
      existingUsers.push(admin2);
      setStorage(USERS_KEY, existingUsers);
    }
  }
  if (!localStorage.getItem(REQUESTS_KEY)) {
    setStorage(REQUESTS_KEY, INITIAL_REQUESTS);
  }
  if (!localStorage.getItem(CLASSROOMS_KEY)) {
    setStorage(CLASSROOMS_KEY, INITIAL_CLASSROOMS);
  }
  if (!localStorage.getItem(SUBJECTS_KEY)) {
    setStorage(SUBJECTS_KEY, INITIAL_SUBJECTS);
  }
  if (!localStorage.getItem(SCHEDULES_KEY)) {
    setStorage(SCHEDULES_KEY, INITIAL_SCHEDULES);
  }
  if (!localStorage.getItem(AVAILABILITY_KEY)) {
    setStorage(AVAILABILITY_KEY, INITIAL_AVAILABILITY);
  }
  if (!localStorage.getItem(ENROLLMENTS_KEY)) {
    setStorage(ENROLLMENTS_KEY, INITIAL_ENROLLMENTS);
  }
  if (!localStorage.getItem(LOCKOUTS_KEY)) {
    setStorage(LOCKOUTS_KEY, [] as LockoutRecord[]);
  }

  // Live async sync from emulated Django server persistent db.json storage
  if (typeof window !== 'undefined' && window.fetch) {
    fetch('/api/db')
      .then(res => res.json())
      .then(payload => {
        if (payload && payload.status === 'ok' && payload.data) {
          const db = payload.data;
          if (db.users) localStorage.setItem(USERS_KEY, JSON.stringify(db.users));
          if (db.requests) localStorage.setItem(REQUESTS_KEY, JSON.stringify(db.requests));
          if (db.classrooms) localStorage.setItem(CLASSROOMS_KEY, JSON.stringify(db.classrooms));
          if (db.subjects) localStorage.setItem(SUBJECTS_KEY, JSON.stringify(db.subjects));
          if (db.schedules) localStorage.setItem(SCHEDULES_KEY, JSON.stringify(db.schedules));
          if (db.availability) localStorage.setItem(AVAILABILITY_KEY, JSON.stringify(db.availability));
          if (db.enrollments) localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(db.enrollments));
          if (db.lockouts) localStorage.setItem(LOCKOUTS_KEY, JSON.stringify(db.lockouts));
          console.log('Django DB Cache loaded successfully from server persistence layer.');
        }
      })
      .catch(err => console.warn('Could not pull persistent backend state:', err));
  }
}

// Active session interface
export interface Session {
  user: UserProfile;
  loginTime: string;
  lastActiveTime: string;
}

// Session Helpers
export function getSession(): Session | null {
  return getStorage<Session | null>(SESSION_KEY, null);
}

export function saveSession(session: Session | null): void {
  setStorage(SESSION_KEY, session);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// User Helpers
export function getUsers(): UserProfile[] {
  return getStorage<UserProfile[]>(USERS_KEY, INITIAL_USERS);
}

export function saveUsers(users: UserProfile[]): void {
  setStorage(USERS_KEY, users);
}

// Access Request Helpers
export function getRequests(): AccessRequest[] {
  return getStorage<AccessRequest[]>(REQUESTS_KEY, INITIAL_REQUESTS);
}

export function saveRequests(requests: AccessRequest[]): void {
  setStorage(REQUESTS_KEY, requests);
}

// Brute Force Lockout Management
export function getLockouts(): LockoutRecord[] {
  return getStorage<LockoutRecord[]>(LOCKOUTS_KEY, []);
}

export function saveLockouts(lockouts: LockoutRecord[]): void {
  setStorage(LOCKOUTS_KEY, lockouts);
}

export function recordFailedAttempt(email: string): { remaining: number; lockedUntil: string | null } {
  const lockouts = getLockouts();
  let record = lockouts.find(l => l.email.toLowerCase() === email.toLowerCase());
  
  if (!record) {
    record = { email: email.toLowerCase(), failedCount: 0, lockedUntil: null };
    lockouts.push(record);
  }
  
  record.failedCount += 1;
  let lockedUntil: string | null = null;
  
  if (record.failedCount >= 5) {
    // Lock for 15 minutes (15 * 60 * 1000 ms)
    const unlockTime = Date.now() + 15 * 60 * 1000;
    record.lockedUntil = new Date(unlockTime).toISOString();
    lockedUntil = record.lockedUntil;
  }
  
  saveLockouts(lockouts);
  return { remaining: Math.max(0, 5 - record.failedCount), lockedUntil };
}

export function clearFailedAttempts(email: string): void {
  const lockouts = getLockouts();
  const index = lockouts.findIndex(l => l.email.toLowerCase() === email.toLowerCase());
  if (index !== -1) {
    lockouts.splice(index, 1);
    saveLockouts(lockouts);
  }
}

export function checkLockout(email: string): { isLocked: boolean; remainingTimeStr: string } {
  const lockouts = getLockouts();
  const record = lockouts.find(l => l.email.toLowerCase() === email.toLowerCase());
  
  if (record && record.lockedUntil) {
    const lockedTime = new Date(record.lockedUntil).getTime();
    const now = Date.now();
    if (now < lockedTime) {
      const diffMin = Math.ceil((lockedTime - now) / 60000);
      return { isLocked: true, remainingTimeStr: `${diffMin} minute${diffMin > 1 ? 's' : ''}` };
    } else {
      // Lock expired, reset failed count
      record.failedCount = 0;
      record.lockedUntil = null;
      saveLockouts(lockouts);
    }
  }
  
  return { isLocked: false, remainingTimeStr: '' };
}

// Classroom Helpers
export function getClassrooms(): Classroom[] {
  return getStorage<Classroom[]>(CLASSROOMS_KEY, INITIAL_CLASSROOMS);
}

export function saveClassrooms(classrooms: Classroom[]): void {
  setStorage(CLASSROOMS_KEY, classrooms);
}

// Subject Helpers
export function getSubjects(): Subject[] {
  return getStorage<Subject[]>(SUBJECTS_KEY, INITIAL_SUBJECTS);
}

export function saveSubjects(subjects: Subject[]): void {
  setStorage(SUBJECTS_KEY, subjects);
}

// Schedule Helpers
export function getSchedules(): Schedule[] {
  return getStorage<Schedule[]>(SCHEDULES_KEY, INITIAL_SCHEDULES);
}

export function saveSchedules(schedules: Schedule[]): void {
  setStorage(SCHEDULES_KEY, schedules);
}

// Availability Helpers
export function getAvailability(): InstructorAvailability[] {
  return getStorage<InstructorAvailability[]>(AVAILABILITY_KEY, INITIAL_AVAILABILITY);
}

export function saveAvailability(avail: InstructorAvailability[]): void {
  setStorage(AVAILABILITY_KEY, avail);
}

export function getEnrollments(): Enrollment[] {
  return getStorage<Enrollment[]>(ENROLLMENTS_KEY, INITIAL_ENROLLMENTS);
}

export function saveEnrollments(enrollments: Enrollment[]): void {
  setStorage(ENROLLMENTS_KEY, enrollments);
}
