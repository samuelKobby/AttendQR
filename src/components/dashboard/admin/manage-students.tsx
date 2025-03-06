import { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Edit,
  Trash2,
  Mail,
  BookOpen,
  Lock,
  CheckCircle,
  XCircle,
  Download,
  Filter,
  Upload,
  Pencil,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddUserForm } from '@/components/forms/add-user-form';

interface Student {
  id: string;
  email: string;
  name: string;
  studentId: string;
  classes: number;
  attendance: number;
  status: 'active' | 'inactive';
  lastActive: string;
}

export function ManageStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch students with their basic information
      const { data: studentsData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

      if (error) {
        console.error('Error fetching students:', error);
        return;
      }

      console.log('Fetched students:', studentsData); // Debug log

      // Format the data with basic information first
      const formattedStudents = studentsData?.map(student => ({
        id: student.id,
        email: student.email,
        name: student.full_name || student.email.split('@')[0],
        studentId: student.student_id || 'N/A',
        classes: 0,
        attendance: 0,
        status: student.status || 'active',
        lastActive: student.last_sign_in_at 
          ? new Date(student.last_sign_in_at).toLocaleDateString()
          : 'Never'
      })) || [];

      // Update state with basic information first
      setStudents(formattedStudents);

      // Then fetch enrollments if we have students
      if (formattedStudents.length > 0) {
        const studentIds = formattedStudents.map(s => s.id);
        
        // Get class enrollments
        const { data: enrollmentsData, error: enrollmentsError } = await supabase
          .from('class_enrollments')
          .select('student_id, class_id')
          .in('student_id', studentIds);

        if (enrollmentsError) {
          console.error('Error fetching enrollments:', enrollmentsError);
          return;
        }

        console.log('Fetched enrollments:', enrollmentsData);

        // Get attendance records for these students
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('student_id, status')
          .in('student_id', studentIds);

        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
          return;
        }

        console.log('Fetched attendance:', attendanceData);

        // Update students with enrollment and attendance data
        const updatedStudents = formattedStudents.map(student => {
          const studentEnrollments = enrollmentsData?.filter(e => e.student_id === student.id) || [];
          const studentAttendance = attendanceData?.filter(a => a.student_id === student.id) || [];
          
          const totalAttendanceRecords = studentAttendance.length;
          const presentRecords = studentAttendance.filter(a => a.status === 'present').length;
          
          const attendancePercentage = totalAttendanceRecords > 0 
            ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
            : 0;

          return {
            ...student,
            classes: studentEnrollments.length,
            attendance: attendancePercentage
          };
        });

        setStudents(updatedStudents);
      }
    } catch (error) {
      console.error('Error in fetchStudents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsAddingStudent(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!window.confirm('Are you sure you want to delete this student? This will also delete all their attendance records and class enrollments.')) return;
    
    try {
      setLoading(true);

      // Call the stored procedure to delete the student and related data
      const { error: txnError } = await supabase.rpc('delete_student', {
        p_student_id: studentId
      });

      if (txnError) throw txnError;

      // Update the local state to remove the deleted student
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Manage Students</h1>
          <p className="text-sm text-gray-500">Add and manage student accounts</p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => setIsAddingStudent(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search students..."
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select className="w-full rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Programs</option>
              <option>Computer Science</option>
              <option>Engineering</option>
              <option>Business</option>
            </select>
          </div>
          <div>
            <select className="w-full rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Years</option>
              <option>Year 1</option>
              <option>Year 2</option>
              <option>Year 3</option>
              <option>Year 4</option>
            </select>
          </div>
          <div>
            <select className="w-full rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Classes
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Attendance
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center">
                  Loading students...
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No Students Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first student</p>
                    <div className="mt-6">
                      <Button onClick={() => setIsAddingStudent(true)}>
                        Add Student
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.studentId}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.classes}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.attendance}%</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.status === 'active' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {student.status}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.lastActive}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(student)}
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600"
                        onClick={() => handleDelete(student.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isAddingStudent && (
        <AddUserForm
          role="student"
          onClose={() => {
            setIsAddingStudent(false);
            setEditingStudent(null);
          }}
          onSuccess={fetchStudents}
          editingStudent={editingStudent}
        />
      )}
    </div>
  );
}