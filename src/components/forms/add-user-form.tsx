import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { databaseService } from '@/services/database';

interface AddUserFormProps {
  role: 'lecturer' | 'student';
  onClose: () => void;
  onSuccess: () => void;
  classId?: string;
  editingLecturer?: {
    id: string;
    email: string;
    name: string;
  } | null;
  editingStudent?: {
    id: string;
    email: string;
    full_name: string;
    student_id?: string;
  } | null;
}

export function AddUserForm({ 
  role, 
  onClose, 
  onSuccess,
  classId,
  editingLecturer,
  editingStudent 
}: AddUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{
    id: string;
    name: string;
    capacity: number;
    lecturer: string;
    availableSlots: number;
  }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: editingLecturer?.email || editingStudent?.email || '',
    full_name: editingLecturer?.name || editingStudent?.full_name || '',
    student_id: editingStudent?.student_id || '',
    class_id: classId || '',
  });

  useEffect(() => {
    if (role === 'student') {
      const loadClasses = async () => {
        try {
          const availableClasses = await databaseService.getAvailableClasses();
          console.log('Available classes in AddUserForm:', availableClasses); // Debug log
          setClasses(availableClasses || []);
        } catch (error) {
          console.error('Error loading classes in AddUserForm:', error);
          toast.error('Failed to load classes');
        }
      };
      loadClasses();
    }
  }, [role]);

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        email: editingStudent.email,
        full_name: editingStudent.full_name,
        student_id: editingStudent.student_id || '',
        class_id: '',
      });
    } else if (editingLecturer) {
      setFormData({
        email: editingLecturer.email,
        full_name: editingLecturer.name,
        student_id: '',
        class_id: '',
      });
    }
  }, [editingStudent, editingLecturer]);

  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      throw new Error('Please enter a valid email address');
    }
    if (!formData.full_name) {
      throw new Error('Please enter a full name');
    }
    if (role === 'student' && !formData.class_id) {
      throw new Error('Please select a class');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      validateForm();

      if (editingStudent) {
        // Update existing student
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            student_id: formData.student_id || null,
          })
          .eq('id', editingStudent.id);

        if (profileError) throw profileError;

        toast.success('Student updated successfully');
      } else if (editingLecturer) {
        // Update existing lecturer
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
          })
          .eq('id', editingLecturer.id);

        if (profileError) throw profileError;

        toast.success('Lecturer updated successfully');
      } else {
        // Create new user
        if (role === 'student') {
          if (!formData.student_id) {
            throw new Error('Student ID is required');
          }
          // Generate temporary password using student ID
          const tempPassword = `Ug${formData.student_id}`;
          
          await databaseService.addStudent({
            email: formData.email,
            full_name: formData.full_name,
            temp_password: tempPassword,
            class_id: formData.class_id || undefined,
            student_id: formData.student_id || undefined,
          });

          toast.success(
            <div>
              <p>Student added successfully!</p>
              <p className="mt-2 text-sm">
                <strong>Student login details:</strong><br />
                Email: {formData.email}<br />
                Temporary Password: {tempPassword}
              </p>
              <p className="mt-2 text-xs">Please share these credentials with the student securely.</p>
            </div>,
            { duration: 10000 } // Show for 10 seconds
          );

          // Reset form
          setFormData({
            email: '',
            full_name: '',
            student_id: '',
            class_id: '',
          });
        } else {
          // Generate temporary password for lecturer
          const tempPassword = `${formData.email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`;
          
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: formData.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              full_name: formData.full_name,
              role: 'lecturer',
            },
          });

          if (authError) throw authError;

          // Create lecturer profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              role: 'lecturer',
            });

          if (profileError) throw profileError;

          // Send welcome email
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: formData.email,
              subject: 'Welcome to AttendQR - Your Account Details',
              html: `
                <h2>Welcome to AttendQR!</h2>
                <p>Your account has been created. Here are your login credentials:</p>
                <p><strong>Email:</strong> ${formData.email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p>Please login and change your password as soon as possible.</p>
                <p>Best regards,<br>The AttendQR Team</p>
              `
            }
          });

          if (emailError) {
            console.error('Error sending welcome email:', emailError);
            toast.error('Account created but failed to send welcome email');
          } else {
            toast.success('Lecturer added successfully');
          }
        }
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      setError(error instanceof Error ? error.message : 'Failed to add user');
      toast.error(error instanceof Error ? error.message : 'Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              {(editingLecturer || editingStudent) ? 'Edit' : 'Add'} {role}
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingLecturer || !!editingStudent}
                required
              />
            </div>

            <div>
              <Input
                type="text"
                placeholder="Full Name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>

            {role === 'student' && (
              <div>
                <Input
                  type="text"
                  placeholder="Student ID"
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                />
              </div>
            )}

            {role === 'student' && !editingStudent && (
              <div>
                <label htmlFor="class_id" className="block text-sm font-medium text-gray-700">
                  Class *
                </label>
                <select
                  id="class_id"
                  name="class_id"
                  value={formData.class_id || ''}
                  onChange={(e) => {
                    console.log('Selected class:', e.target.value); // Debug log
                    setFormData(prev => ({ ...prev, class_id: e.target.value }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  required
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option 
                      key={cls.id} 
                      value={cls.id} 
                      disabled={cls.availableSlots <= 0}
                    >
                      {cls.name} - {cls.lecturer} ({cls.availableSlots} slots)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
          )}

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={
                role === 'student' 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                  : role === 'lecturer'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }
            >
              {loading ? 'Saving...' : editingLecturer || editingStudent ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}