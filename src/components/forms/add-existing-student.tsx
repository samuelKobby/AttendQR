import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { databaseService } from '@/services/database';
import { toast } from '@/components/ui/use-toast';

interface Student {
  id: string;
  full_name: string;
  email: string;
  student_id?: string;
}

interface AddExistingStudentProps {
  classId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddExistingStudent({ classId, onClose, onSuccess }: AddExistingStudentProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchStudents();
    } else {
      setStudents([]);
    }
  }, [searchTerm]);

  const searchStudents = async () => {
    try {
      setLoading(true);
      // Search for students that are not already in this class
      const { data: enrollments } = await supabase
        .from('class_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('status', 'active');

      const enrolledStudentIds = enrollments?.map(e => e.student_id) || [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, student_id')
        .eq('role', 'student')
        .not('id', 'in', `(${enrolledStudentIds.join(',')})`)
        .ilike('full_name', `%${searchTerm}%`);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error searching students:', error);
      toast({
        title: "Error",
        description: "Failed to search students",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedStudent) return;

    try {
      setLoading(true);
      await databaseService.enrollStudentInClass(classId, selectedStudent.id);
      toast({
        title: "Success",
        description: "Student added to class successfully",
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding student:', error);
      toast({
        title: "Error",
        description: "Failed to add student to class",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Add Existing Student</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search students by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="max-h-60 overflow-y-auto border rounded-md">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : students.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm.length < 2 ? 'Type to search students' : 'No students found'}
            </div>
          ) : (
            <div className="divide-y">
              {students.map((student) => (
                <div
                  key={student.id}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedStudent?.id === student.id ? 'bg-green-50' : ''
                  }`}
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="font-medium">{student.full_name}</div>
                  <div className="text-sm text-gray-500">{student.email}</div>
                  {student.student_id && (
                    <div className="text-sm text-gray-400">ID: {student.student_id}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAddStudent}
            disabled={!selectedStudent || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            Add to Class
          </Button>
        </div>
      </div>
    </div>
  );
}
