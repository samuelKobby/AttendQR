import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Upload,
  Key,
  GraduationCap,
  Pencil
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddUserForm } from '@/components/forms/add-user-form';
import { StudentAvatar } from '@/components/ui/student-avatar';
import { BulkStudentUpload } from './bulk-student-upload';
import { AssignClassModal } from './assign-class-modal';
import { databaseService } from '@/services/database';
import toast from 'react-hot-toast';

interface Student {
  id: string;
  email: string;
  full_name: string;
  student_id?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export function ManageStudents() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [isAssigningClass, setIsAssigningClass] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

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

      // Format the data with basic information first
      const formattedStudents = studentsData?.map(student => ({
        id: student.id,
        email: student.email,
        full_name: student.full_name,
        student_id: student.student_id,
        status: student.status,
        created_at: student.created_at,
        updated_at: student.updated_at,
      })) || [];

      // Update state with basic information first
      setStudents(formattedStudents);

      // Then fetch attendance records if we have students
      if (formattedStudents.length > 0) {
        const studentIds = formattedStudents.map(s => s.id);
        
        // Get attendance records for these students
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance_records')
          .select('user_id, status')
          .in('user_id', studentIds);

        if (attendanceError) {
          console.error('Error fetching attendance:', attendanceError);
          return;
        }

        // Update students with attendance data
        const updatedStudents = formattedStudents.map(student => {
          const studentAttendance = attendanceData?.filter(a => a.user_id === student.id) || [];
          const presentCount = studentAttendance.filter(a => a.status === 'present').length;
          const totalSessions = studentAttendance.length;
          
          return {
            ...student,
            attendance: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0
          };
        });

        setStudents(updatedStudents);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
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

  const handleStatusChange = async (studentId: string, newStatus: 'active' | 'inactive') => {
    try {
      setLoading(true);
      
      // Update the status in the database
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', studentId);

      if (error) throw error;

      // Update local state
      setStudents(prev => 
        prev.map(student => 
          student.id === studentId 
            ? { ...student, status: newStatus }
            : student
        )
      );
    } catch (error) {
      console.error('Error updating student status:', error);
      alert('Failed to update student status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudents(students.map(s => s.id));
      setShowBulkActions(true);
    } else {
      setSelectedStudents([]);
      setShowBulkActions(false);
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudents(prev => [...prev, studentId]);
      setShowBulkActions(true);
    } else {
      setSelectedStudents(prev => prev.filter(id => id !== studentId));
      const updatedCount = selectedStudents.length - 1;
      setShowBulkActions(updatedCount > 1);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedStudents.length} students? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      // Call the stored procedure to delete the students and related data
      const { error: txnError } = await supabase.rpc('delete_students', {
        p_student_ids: selectedStudents
      });

      if (txnError) throw txnError;

      // Update the local state to remove the deleted students
      setStudents((prev) => prev.filter((s) => !selectedStudents.includes(s.id)));
      setSelectedStudents([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error deleting students:', error);
      alert('Failed to delete students');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdateStatus = async (status: 'active' | 'inactive') => {
    if (!window.confirm(`Are you sure you want to mark ${selectedStudents.length} students as ${status}?`)) {
      return;
    }

    setLoading(true);
    try {
      // Update the status in the database
      const { error } = await supabase
        .from('profiles')
        .update({ status: status })
        .in('id', selectedStudents);

      if (error) throw error;

      // Update local state
      setStudents(prev => 
        prev.map(student => 
          selectedStudents.includes(student.id) 
            ? { ...student, status: status }
            : student
        )
      );
      setSelectedStudents([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error updating students:', error);
      alert('Failed to update students');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkResetPasswords = async () => {
    if (!window.confirm(`Are you sure you want to reset passwords for ${selectedStudents.length} students? They will receive emails with their new temporary passwords.`)) {
      return;
    }

    setLoading(true);
    try {
      const results = await databaseService.bulkResetPasswords(selectedStudents);
      toast.success(`Successfully reset passwords for ${results.length} students`);
      setSelectedStudents([]);
      setShowBulkActions(false);
    } catch (error) {
      console.error('Error resetting passwords:', error);
      toast.error('Failed to reset passwords');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setIsAddingStudent(true);
  };

  // Filter students based on search term and status
  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-bold">Manage Students</h2>
          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
            {students.length} total
          </span>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsAddingStudent(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
          <Button
            onClick={() => setIsBulkUploading(true)}
            variant="outline"
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">{selectedStudents.length} students selected</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkUpdateStatus('active')}
              disabled={loading}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Active
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkUpdateStatus('inactive')}
              disabled={loading}
              className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Mark Inactive
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssigningClass(true)}
              disabled={loading}
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              <GraduationCap className="h-4 w-4 mr-2" />
              Assign to Class
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkResetPasswords}
              disabled={loading}
              className="text-purple-600 border-purple-600 hover:bg-purple-50"
            >
              <Key className="h-4 w-4 mr-2" />
              Reset Passwords
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              disabled={loading}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Search and filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-md border-gray-300"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Student list */}
      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  checked={selectedStudents.length === students.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-4">
                  Loading students...
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
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
              filteredStudents.map((student) => (
                <tr key={student.id} className={loading ? 'opacity-50' : ''}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={selectedStudents.includes(student.id)}
                      onChange={(e) => handleSelectStudent(student.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <StudentAvatar name={student.full_name} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.full_name}</div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.email}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {student.student_id || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusChange(student.id, student.status === 'active' ? 'inactive' : 'active')}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      disabled={loading}
                    >
                      {student.status === 'active' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {student.status}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{student.updated_at}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(student)}
                        disabled={loading}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(student.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
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

      {/* Add/Edit Student Modal */}
      {isAddingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <AddUserForm
              role="student"
              onClose={() => {
                setIsAddingStudent(false);
                setEditingStudent(null);
              }}
              onSuccess={() => {
                setIsAddingStudent(false);
                setEditingStudent(null);
                fetchStudents();
              }}
              editingStudent={editingStudent}
            />
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <BulkStudentUpload
              onClose={() => setIsBulkUploading(false)}
              onSuccess={() => {
                setIsBulkUploading(false);
                fetchStudents();
              }}
            />
          </div>
        </div>
      )}

      {/* Assign Class Modal */}
      {isAssigningClass && (
        <AssignClassModal
          studentIds={selectedStudents}
          onClose={() => setIsAssigningClass(false)}
          onSuccess={() => {
            setIsAssigningClass(false);
            fetchStudents();
          }}
        />
      )}
    </div>
  );
}