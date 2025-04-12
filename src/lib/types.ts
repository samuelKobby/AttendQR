export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lecturer' | 'student';
  student_id?: string;
};

export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
};

export type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

export type Class = {
  id: string;
  name: string;
  courseCode: string;
  lecturerId: string;
  schedule: string;
  students: string[]; // Array of student IDs
};

export type AttendanceRecord = {
  id: string;
  session_id: string;
  student_id: string;
  student_name: string;
  marked_at: string;
  signature: string;
};

export type QRCode = {
  id: string;
  classId: string;
  expiresAt: string;
  data: string;
};