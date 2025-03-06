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
  UserPlus,
  Pencil,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AddUserForm } from '@/components/forms/add-user-form';

interface Lecturer {
  id: string;
  email: string;
  name: string;
  classes: number;
  students: number;
  status: 'active' | 'inactive';
  lastActive: string;
  department: string;
  avatar_url: string;
}

export function ManageLecturers() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      setLoading(true);
      // Fetch lecturers with their basic information
      const { data: lecturersData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lecturer');

      if (error) {
        console.error('Error fetching lecturers:', error);
        return;
      }

      console.log('Fetched lecturers:', lecturersData); // Debug log

      // Format the data
      const formattedLecturers = lecturersData?.map(lecturer => ({
        id: lecturer.id,
        email: lecturer.email,
        name: lecturer.full_name || lecturer.email.split('@')[0],
        department: lecturer.department || 'Not Assigned',
        avatar_url: lecturer.avatar_url,
        status: lecturer.status || 'active',
        lastActive: lecturer.last_sign_in_at 
          ? new Date(lecturer.last_sign_in_at).toLocaleDateString()
          : 'Never',
        classes: 0, // We'll update these counts later
        students: 0
      })) || [];

      setLecturers(formattedLecturers);

      // Now fetch class counts
      if (formattedLecturers.length > 0) {
        const lecturerIds = formattedLecturers.map(l => l.id);
        const { data: classData } = await supabase
          .from('classes')
          .select('lecturer_id, id')
          .in('lecturer_id', lecturerIds);

        console.log('Fetched classes:', classData); // Debug log

        if (classData) {
          const updatedLecturers = formattedLecturers.map(lecturer => {
            const lecturerClasses = classData.filter(c => c.lecturer_id === lecturer.id);
            return {
              ...lecturer,
              classes: lecturerClasses.length
            };
          });
          setLecturers(updatedLecturers);
        }
      }
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (lecturer: Lecturer) => {
    setEditingLecturer(lecturer);
    setIsAddingLecturer(true);
  };

  const handleDelete = async (lecturerId: string) => {
    if (!window.confirm('Are you sure you want to delete this lecturer? This will also delete all their associated class sessions.')) return;
    
    try {
      setLoading(true);

      // Start a transaction to delete everything
      const { error: txnError } = await supabase.rpc('delete_lecturer', {
        p_lecturer_id: lecturerId
      });

      if (txnError) throw txnError;

      // Update the local state to remove the deleted lecturer
      setLecturers((prev) => prev.filter((l) => l.id !== lecturerId));
    } catch (error) {
      console.error('Error deleting lecturer:', error);
      alert('Failed to delete lecturer and their class sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between  mt-10 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Manage Lecturers</h1>
          <p className="text-sm text-gray-500">Add and manage lecturer accounts</p>
        </div>
        <Button 
          className="w-full sm:w-auto"
          onClick={() => setIsAddingLecturer(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Lecturer
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search lecturers..."
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <select className="w-full rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>All Departments</option>
              <option>Computer Science</option>
              <option>Engineering</option>
              <option>Business</option>
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

      {/* Lecturers List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold">Lecturers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Classes
                </th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {lecturers.map((lecturer) => (
                <tr key={lecturer.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={lecturer.avatar_url || '/placeholder.png'}
                          alt=""
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {lecturer.name}
                        </div>
                        <div className="text-sm text-gray-500">{lecturer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {lecturer.department}
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {lecturer.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {lecturer.classes}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(lecturer)}
                        disabled={loading}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(lecturer.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {lecturers.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Lecturers Found</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by adding your first lecturer
          </p>
          <Button className="mt-4" onClick={() => setIsAddingLecturer(true)}>
            Add Lecturer
          </Button>
        </div>
      )}

      {isAddingLecturer && (
        <AddUserForm
          role="lecturer"
          onClose={() => setIsAddingLecturer(false)}
          onSuccess={fetchLecturers}
          editingLecturer={editingLecturer}
        />
      )}
    </div>
  );
}