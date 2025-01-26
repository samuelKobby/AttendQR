export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'lecturer' | 'student';
  studentId?: string;  // Optional field for student users
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
  classId: string;
  studentId: string;
  timestamp: string;
  status: 'present' | 'absent';
};

export type QRCode = {
  id: string;
  classId: string;
  expiresAt: string;
  data: string;
};