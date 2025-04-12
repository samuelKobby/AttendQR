import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AddUserForm } from '../../components/forms/add-user-form';
import { AddExistingStudent } from '../../components/forms/add-existing-student';
import { EditStudentForm } from '../../components/forms/edit-student-form';
import { lecturerService } from '../../services/lecturer';
import { databaseService } from '../../services/database';
import { supabase } from '../../lib/supabase';
import type { StudentCreationData } from '../../services/database';
import { toast } from '../../components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Users, GraduationCap, Trash2, Trash, Pencil } from 'lucide-react';
import { StudentAvatar } from '@/components/ui/student-avatar';
import { AssignClassModal } from '@/components/dashboard/lecturer/assign-class-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Student {
  id: string;
  email: string;
  full_name: string;
  student_id?: string;
  created_at?: string;
  status: 'active' | 'inactive';
}

interface Class {
  id: string;
  name: string;
  capacity: number;
}

export function ManageClassStudents() {
  const { classId } = useParams<{ classId: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isAddingExistingStudent, setIsAddingExistingStudent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isAssigningClass, setIsAssigningClass] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentLecturerId, setCurrentLecturerId] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchCurrentLecturerId();
    fetchClassDetails();
  }, []);

  useEffect(() => {
    setShowBulkActions(selectedStudents.length > 0);
  }, [selectedStudents]);

  const fetchCurrentLecturerId = async () => {
    try {
      const id = await lecturerService.getCurrentLecturerId();
      setCurrentLecturerId(id);
    } catch (error) {
      console.error('Error fetching lecturer ID:', error);
    }
  };

  const fetchStudents = async () => {
    if (!classId) return;
    
    try {
      setIsLoading(true);
      const studentsData = await databaseService.getStudentsInClass(classId);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch students',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClassDetails = async () => {
    if (!classId) return;
    
    try {
      const classDetails = await databaseService.getClass(classId);
      setSelectedClass(classDetails);
    } catch (error) {
      console.error('Error fetching class details:', error);
      toast({
        title: "Error",
        description: "Failed to load class details",
        variant: "destructive"
      });
    }
  };

  const handleAddStudent = async (data: Omit<StudentCreationData, 'temp_password'>) => {
    if (!classId) return;

    try {
      setIsLoading(true);
      const newStudent = await lecturerService.addStudentToClass(classId, {
        ...data,
        temp_password: `${data.email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`,
      });
      
      toast({
        title: 'Success',
        description: 'Student added successfully',
        variant: 'default',
      });

      // Add the new student to the selected list and show the assign modal
      setSelectedStudents([newStudent.id]);
      setIsAssigningClass(true);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add student',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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

  const handleSelectStudent = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      setSelectedStudents(selectedStudents.filter((id) => id !== studentId));
    } else {
      setSelectedStudents([...selectedStudents, studentId]);
    }
  };

  const handleAssignSuccess = () => {
    setSelectedStudents([]);
    setShowBulkActions(false);
    setIsAssigningClass(false);
    fetchStudents();
  };

  const handleBulkDelete = async () => {
    try {
      setIsLoading(true);
      
      // Delete selected enrollments
      const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('class_id', classId)
        .in('student_id', selectedStudents);

      if (error) throw error;

      // Update local state
      setStudents(students.filter(student => !selectedStudents.includes(student.id)));
      setSelectedStudents([]);
      setIsDeleting(false);

      toast({
        title: "Success",
        description: `${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''} removed from class`,
      });
    } catch (error) {
      console.error('Error deleting students:', error);
      toast({
        title: "Error",
        description: "Failed to remove students from class",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (studentId: string, newStatus: 'active' | 'inactive') => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('class_enrollments')
        .update({ status: newStatus })
        .eq('class_id', classId)
        .eq('student_id', studentId);

      if (error) throw error;

      // Update the local state
      setStudents(students.map(student => 
        student.id === studentId 
          ? { ...student, status: newStatus }
          : student
      ));

      toast({
        title: "Success",
        description: `Student ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      console.error('Error toggling student status:', error);
      toast({
        title: "Error",
        description: "Failed to update student status",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('class_enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Student removed from class",
      });
      fetchStudents();
    } catch (error) {
      console.error('Error removing student:', error);
      toast({
        title: "Error",
        description: "Failed to remove student from class",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter students based on search term
  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Manage Students In {selectedClass?.name}</h1>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsAddingExistingStudent(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Add Existing Student
            </Button>
            <Button
              onClick={() => setIsAddingStudent(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              Add New Student
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
                onClick={() => setIsDeleting(true)}
                disabled={isLoading}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove from Class
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
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
                  Student ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-4">
                    Loading students...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
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
                  <tr key={student.id} className={isLoading ? 'opacity-50' : ''}>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
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
                      <div className="text-sm text-gray-500">
                        {student.student_id || 'N/A'}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(student.id, student.status === 'active' ? 'inactive' : 'active')}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          student.status === 'active' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                        disabled={isLoading}
                      >
                        {student.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingStudent(student)}
                          className="text-blue-600 hover:text-blue-700"
                          title="Edit Student"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Remove Student"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Student Modal */}
        {isAddingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <AddUserForm
                role="student"
                onClose={() => setIsAddingStudent(false)}
                onSuccess={handleAddStudent}
                classId={classId}
              />
            </div>
          </div>
        )}

        {/* Add Existing Student Modal */}
        {isAddingExistingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <AddExistingStudent
                classId={classId}
                onClose={() => setIsAddingExistingStudent(false)}
                onSuccess={fetchStudents}
              />
            </div>
          </div>
        )}

        {/* Assign Class Modal */}
        {isAssigningClass && (
          <AssignClassModal
            studentIds={selectedStudents}
            onClose={() => setIsAssigningClass(false)}
            onSuccess={handleAssignSuccess}
            lecturerId={currentLecturerId}
          />
        )}

        {/* Edit Student Modal */}
        {editingStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <EditStudentForm
                student={editingStudent}
                onClose={() => setEditingStudent(null)}
                onSuccess={fetchStudents}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Students</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} from this class? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleting(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
