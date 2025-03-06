import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AddUserFormProps {
  role: 'lecturer' | 'student';
  onClose: () => void;
  onSuccess: () => void;
  editingLecturer?: {
    id: string;
    email: string;
    name: string;
  } | null;
  editingStudent?: {
    id: string;
    email: string;
    name: string;
    studentId: string;
  } | null;
}

export function AddUserForm({ 
  role, 
  onClose, 
  onSuccess, 
  editingLecturer,
  editingStudent 
}: AddUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: editingLecturer?.email || editingStudent?.email || '',
    password: '',
    fullName: editingLecturer?.name || editingStudent?.name || '',
    studentId: editingStudent?.studentId || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (editingLecturer || editingStudent) {
        // Update existing user
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            ...(role === 'student' ? { student_id: formData.studentId } : {})
          })
          .eq('id', (editingLecturer || editingStudent)?.id);

        if (updateError) throw updateError;
      } else {
        // Check if user already exists
        const { data: existingUsers } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', formData.email);

        if (existingUsers && existingUsers.length > 0) {
          throw new Error('A user with this email already exists');
        }

        // Create new user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              role: role,
              student_id: role === 'student' ? formData.studentId : null,
            },
          },
        });

        if (signUpError) {
          if (signUpError.message === 'User already registered') {
            throw new Error('A user with this email already exists');
          }
          throw signUpError;
        }

        if (!authData?.user?.id) {
          throw new Error('Failed to create user account');
        }

        // Create the profile record
        const profileData = {
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: role,
          ...(role === 'student' ? { student_id: formData.studentId } : {})
        };
        
        console.log('Creating profile with data:', profileData);
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);

        if (profileError) {
          console.error('Failed to create profile. Error:', profileError);
          console.error('Profile data was:', profileData);
          throw new Error(`Failed to create user profile: ${profileError.message}`);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating/updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const isValidForm = () => {
    if (editingLecturer || editingStudent) {
      return formData.fullName.trim() !== '' && 
        (role === 'student' ? formData.studentId.trim() !== '' : true);
    }
    return formData.email.trim() !== '' && 
      formData.password.trim() !== '' && 
      formData.fullName.trim() !== '' && 
      (role === 'student' ? formData.studentId.trim() !== '' : true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">
            {(editingLecturer || editingStudent) ? 'Edit' : 'Add New'} {role.charAt(0).toUpperCase() + role.slice(1)}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading || !!editingLecturer || !!editingStudent}
              required
            />
          </div>
          {!(editingLecturer || editingStudent) && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              disabled={loading}
              required
            />
          </div>
          {role === 'student' && (
            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <Input
                id="studentId"
                type="text"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                disabled={loading}
                required
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 mt-2">
              {error}
            </p>
          )}

          <div className="flex justify-end space-x-4">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !isValidForm()}
            >
              {loading ? ((editingLecturer || editingStudent) ? 'Updating...' : 'Creating...') : (editingLecturer || editingStudent) ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}