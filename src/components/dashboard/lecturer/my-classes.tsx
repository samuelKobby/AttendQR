import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Users,
  Clock,
  Search,
  Filter,
  Plus,
  Download,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  MapPin,
  Calendar,
  History,
  QrCode,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { CreateClassForm } from './create-class-form';
import { EditClassForm } from './edit-class-form';
import { AttendanceQRModal } from './attendance-qr-modal';
import { databaseService } from '@/services/database';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';

interface Class {
  id: string;
  name: string;
  course_code: string;
  location: string;
  schedule: string;
  capacity: number;
  total_students: number;
  attendance_rate: number;
}

export function MyClasses() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStudentList, setShowStudentList] = useState(false);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState<Class | null>(null);
  const [students, setStudents] = useState<Array<{
    id: string;
    full_name: string;
    email: string;
    student_id?: string;
    status: 'active' | 'inactive';
  }>>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('lecturer_id', authState.user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error in fetchClasses:', error);
        throw error;
      }
      
      console.log('Fetched classes:', data);
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to fetch classes',
        confirmButtonColor: '#3085d6',
      });
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    try {
      // First verify that the user has permission to delete this class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        throw new Error('Unable to verify class ownership');
      }

      const result = await Swal.fire({
        title: 'Delete Class',
        text: `Are you sure you want to delete "${className}"? This action cannot be undone. All associated attendance records and sessions will also be deleted.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
          try {
            setLoading(true);
            await databaseService.deleteClass(classId);
            return true;
          } catch (error) {
            console.error('Error in handleDeleteClass:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            Swal.showValidationMessage(`Delete failed: ${errorMessage}`);
            return false;
          } finally {
            setLoading(false);
          }
        },
        allowOutsideClick: () => !loading
      });

      if (result.isConfirmed) {
        // Optimistically update UI
        setClasses(prevClasses => prevClasses.filter(c => c.id !== classId));
        
        // Verify deletion with retries
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          const { data } = await supabase
            .from('classes')
            .select('id')
            .eq('id', classId)
            .maybeSingle();
          
          if (!data) {
            // Successfully deleted
            Swal.fire({
              title: 'Deleted!',
              text: 'The class has been deleted successfully.',
              icon: 'success',
              confirmButtonColor: '#3085d6',
            });
            return;
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryCount++;
        }
        
        // If we get here, verification failed
        console.error('Verification failed after retries: Class still exists');
        await fetchClasses();
        throw new Error('Unable to verify class deletion - please try again');
      }
    } catch (error) {
      console.error('Error in delete process:', error);
      
      // Show error message and refresh the list
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error instanceof Error 
          ? error.message 
          : 'Failed to delete class. Please try again or contact support.',
        confirmButtonColor: '#3085d6',
      });
      
      await fetchClasses();
    }
  };

  const handleEditClick = (classData: Class) => {
    setSelectedClass(classData);
    setShowEditForm(true);
  };

  const handleEditSuccess = () => {
    fetchClasses();
  };

  const handleStudentStatusChange = async (studentId: string, newStatus: 'active' | 'inactive') => {
    if (!selectedClassForStudents) return;

    try {
      const { error } = await supabase
        .from('class_enrollments')
        .update({ status: newStatus })
        .eq('class_id', selectedClassForStudents.id)
        .eq('student_id', studentId);

      if (error) throw error;

      // Refresh the class list to get updated student counts
      fetchClasses();

      toast.success(`Student ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating student status:', error);
      toast.error('Failed to update student status');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">My Classes</h1>
          <p className="text-sm text-gray-500">Manage your classes and sessions</p>
        </div>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Class
        </Button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white rounded-lg shadow-sm overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{cls.course_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleEditClick(cls)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleDeleteClass(cls.id, cls.name)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2 " />
                  <span>{cls.capacity}</span>
                </div>
                {cls.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{cls.location}</span>
                  </div>
                )}
                {cls.schedule && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{cls.schedule}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedClass(cls);
                    setShowQRModal(true);
                  }}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Take Attendance
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Link to={`/lecturer/classes/${cls.id}/students`} className="flex items-center justify-center w-full">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Students
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreateForm && (
        <CreateClassForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchClasses();
          }}
        />
      )}

      {/* Edit Class Dialog */}
      {showEditForm && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Edit Class</h2>
            <EditClassForm
              classData={selectedClass}
              onClose={() => {
                setShowEditForm(false);
                setSelectedClass(null);
              }}
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>
      )}

      {showQRModal && selectedClass && (
        <AttendanceQRModal
          classId={selectedClass.id}
          className={selectedClass.name}
          isOpen={showQRModal}
          onClose={() => {
            setShowQRModal(false);
            setSelectedClass(null);
          }}
        />
      )}

      {/* Student List Modal
      {showStudentList && selectedClassForStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-4xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">
                  Students in {selectedClassForStudents.name}
                </h2>
                <p className="text-sm text-gray-500">
                  {students.length} student{students.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStudentList(false);
                  setSelectedClassForStudents(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Student ID</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="px-4 py-2">{student.full_name}</td>
                      <td className="px-4 py-2">{student.email}</td>
                      <td className="px-4 py-2">{student.student_id || '-'}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleStudentStatusChange(
                              student.id,
                              student.status === 'active' ? 'inactive' : 'active'
                            )
                          }
                          className={student.status === 'active' ? 'text-red-600' : 'text-green-600'}
                        >
                          {student.status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}