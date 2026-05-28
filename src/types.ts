export type UserRole = 'admin' | 'instructor' | 'student';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: string | null;
  mustChangePassword?: boolean;
  passwordHash: string; // we'll use a simple mock hash/string for client-side matching
  status: 'active' | 'revoked';
}

export interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  role: 'instructor' | 'student';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
}

export interface Classroom {
  id: string;
  name: string;
  building: string;
  capacity: number;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  instructorId: string;
}

export interface Schedule {
  id: string;
  subjectId: string;
  classroomId: string;
  instructorId: string;
  dayOfWeek: string; // e.g., 'Monday', 'Tuesday'
  startTime: string; // e.g., '08:00'
  endTime: string; // e.g., '09:30'
}

export interface InstructorAvailability {
  id: string;
  instructorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface Enrollment {
  id: string;
  studentId: string;
  subjectId: string;
}
