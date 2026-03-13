
export interface Subject {
  id: string;
  name: string;
}

export interface Level {
  id: string;
  code: string;
  subjectId: string;
  name: string;
  resources?: string;
}

export interface Shift {
  id: string;
  name: string;
  days: string[]; // e.g., ["Monday", "Wednesday", "Friday"]
  time: string; // e.g., "18:00 - 20:00"
}

export interface Teacher {
  id: string;
  name: string;
  gender?: 'Nam' | 'Nữ';
  dob: string;
  phone: string;
  email: string;
  notes: string;
  subjectIds: string[];
  availableShiftIds: string[];
  driveLink?: string;
}

export interface Student {
  id: string;
  student_id: string; // Primary Key
  full_name: string;
  dob: string;
  phone: string;
  email: string;
  subjectId: string; // Linked to Subject
  status?: string; // Calculated status for reporting: 'Chưa học' | 'Đang học' | 'Chờ lên kỳ'
}

export type ClassStatus = 'Đang hoạt động' | 'Đã kết thúc' | 'Sắp kết thúc' | 'Pending';

export interface Class {
  id: string;
  class_id: string; // Primary Key
  courseName: string;
  subjectId: string;
  levelId: string;
  shiftId: string;
  startDate: string;
  endDate: string;
  sessions: number | string;
  periods: number | string;
  status: string; // Now calculated dynamically
  room?: string;
  notes: string; 
}

export interface Enrollment {
  id: string;
  class_id: string;
  student_id: string;
  teacherId: string;
  isDroppedOut?: boolean;
}

export interface StudentGrade {
  id: string;
  student_id: string;
  class_id: string;
  midterm: number | string;
  listening: number | string;
  reading: number | string;
  speaking: number | string;
  writing: number | string;
  total?: number | string;
  isAbsent?: boolean;
}

export interface ScheduleRow {
  id: string;
  courseName: string;
  subjectId: string;
  class_id: string;
  className: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  shiftId: string;
}

export interface Attendance {
  id: string;
  class_id: string;
  student_id: string;
  sessionIndex: number;
  isPresent: boolean;
}

export interface SessionDate {
  id: string;
  class_id: string;
  sessionIndex: number;
  date: string;
}

export interface AdmissionSummary {
  Course_Name: string;
  Start_Date: string;
  End_Date: string;
  Total_Students: number;
  Previous_Course_Name: string;
  Returning_Students: number;
}

export type AppView = 'DASHBOARD' | 'SUBJECTS' | 'LEVELS' | 'SHIFTS' | 'TEACHERS' | 'STUDENTS' | 'CLASSES' | 'SCHEDULER' | 'FUNCTIONS' | 'REPORTS' | 'REPORTS_TEACHER' | 'REPORTS_STUDENT';
