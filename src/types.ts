/**
 * TypeScript definitions for the Smart Student Attendance System.
 * Matches the requested PostgreSQL schema structure.
 */

export type UserRole = 'Admin' | 'Teacher' | 'Student';

export interface DbRole {
  id: string; // 'admin' | 'teacher' | 'student'
  name: UserRole;
  description: string;
}

export interface DbUser {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string;
  role: UserRole; // Stored directly or referenced via role_id
  created_at: string;
  updated_at: string;
}

export interface DbStudent {
  id: string;
  student_code: string;
  user_id: string; // References users.id
  class_id: string; // References classes.id
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  address: string;
  status: 'Active' | 'Suspended' | 'Inactive';
  created_at: string;
}

export interface DbTeacher {
  id: string;
  user_id: string; // References users.id
  department: string;
  phone: string;
  created_at: string;
}

export interface DbClass {
  id: string;
  class_name: string;
  room: string;
  teacher_id: string; // References teachers.id (Lead Teacher)
  created_at: string;
}

export interface DbSubject {
  id: string;
  subject_name: string;
  subject_code: string;
}

export interface DbSchedule {
  id: string;
  class_id: string; // References classes.id
  subject_id: string; // References subjects.id
  teacher_id: string; // References teachers.id
  day_of_week: string; // 'Monday', 'Tuesday', etc.
  start_time: string; // e.g., '09:00'
  end_time: string; // e.g., '10:30'
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface DbAttendance {
  id: string;
  student_id: string; // References students.id
  class_id: string; // References classes.id
  subject_id: string; // References subjects.id
  attendance_date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  check_in_time: string | null; // HH:MM:SS or null
  remarks: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string; // References users.id
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DbActivityLog {
  id: string;
  user_id: string; // References users.id
  action: string;
  description: string;
  created_at: string;
}

// Session representations
export interface Session {
  user: DbUser;
  token: string;
}

// Comprehensive schema of our local JSON database
export interface DatabaseSchema {
  users: DbUser[];
  roles: DbRole[];
  students: DbStudent[];
  teachers: DbTeacher[];
  classes: DbClass[];
  subjects: DbSubject[];
  schedules: DbSchedule[];
  attendance: DbAttendance[];
  notifications: DbNotification[];
  activity_logs: DbActivityLog[];
}
