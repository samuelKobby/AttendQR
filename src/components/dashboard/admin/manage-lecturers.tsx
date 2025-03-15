import { useState, useEffect } from 'react';
import {
  Search,
  Trash2,
  UserPlus,
  Pencil,
  CheckCircle,
  XCircle,
  Users,
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

// Function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Avatar component that shows initials with lecturer color scheme
function LecturerAvatar({ name }: { name: string }) {
  const initials = getInitials(name);
  return (
    <div className="h-10 w-10 rounded-full flex items-center justify-center font-medium bg-green-500/15 text-green-600">
      {initials}
    </div>
  );
}

export function ManageLecturers() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [isAddingLecturer, setIsAddingLecturer] = useState(false);
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

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

      // Format the data
      const formattedLecturers = lecturersData?.map(lecturer => ({
        id: lecturer.id,
        email: lecturer.email,
        name: lecturer.full_name || lecturer.email.split('@')[0],
        department: lecturer.department || 'Not Assigned',
        avatar_url: lecturer.avatar_url,
        // Ensure status is strictly typed
        status: (lecturer.status === 'active' || lecturer.status === 'inactive')
          ? lecturer.status
          : 'inactive',
        lastActive: lecturer.last_sign_in_at 
          ? new Date(lecturer.last_sign_in_at).toLocaleDateString()
          : 'Never',
        classes: 0,
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

        if (classData) {
          const updatedLecturers = formattedLecturers.map(lecturer => {
            const lecturerClasses = classData.filter(c => c.lecturer_id === lecturer.id);
            
            // Update status to inactive if no recent activity (30 days)
            const lastActive = new Date(lecturer.lastActive);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const newStatus = lastActive < thirtyDaysAgo ? 'inactive' as const : 'active' as const;
            
            return {
              ...lecturer,
              classes: lecturerClasses.length,
              status: newStatus
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

  const handleStatusChange = async (lecturerId: string, newStatus: 'active' | 'inactive') => {
    try {
      setLoading(true);
      
      // Update the status in the database
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', lecturerId);

      if (error) throw error;

      // Update local state
      setLecturers(prev => 
        prev.map(lecturer => 
          lecturer.id === lecturerId 
            ? { ...lecturer, status: newStatus }
            : lecturer
        )
      );
    } catch (error) {
      console.error('Error updating lecturer status:', error);
      alert('Failed to update lecturer status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter lecturers based on search term and status
  const filteredLecturers = lecturers.filter(lecturer => {
    const matchesSearch = 
      lecturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lecturer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-10 gap-4">
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
            <Input
              type="text"
              placeholder="Search lecturers..."
              className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select 
              className="w-full rounded-md border border-gray-300 py-2 px-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lecturers List */}
      <div className="rounded-md border">
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
                Classes
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
                <td colSpan={6} className="text-center py-4">
                  Loading lecturers...
                </td>
              </tr>
            ) : filteredLecturers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900">No Lecturers Found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding your first lecturer</p>
                    <div className="mt-6">
                      <Button onClick={() => setIsAddingLecturer(true)}>
                        Add Lecturer
                      </Button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLecturers.map((lecturer) => (
                <tr key={lecturer.id}>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <LecturerAvatar name={lecturer.name} />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{lecturer.name}</div>
                        <div className="text-sm text-gray-500">{lecturer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lecturer.department}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{lecturer.classes}</div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleStatusChange(lecturer.id, lecturer.status === 'active' ? 'inactive' : 'active')}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        lecturer.status === 'active'
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                      disabled={loading}
                    >
                      {lecturer.status === 'active' ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {lecturer.status}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{lecturer.lastActive}</div>
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
                        className="text-red-600"
                        onClick={() => handleDelete(lecturer.id)}
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

      {isAddingLecturer && (
        <AddUserForm
          role="lecturer"
          onClose={() => {
            setIsAddingLecturer(false);
            setEditingLecturer(null);
          }}
          onSuccess={fetchLecturers}
          editingLecturer={editingLecturer}
        />
      )}
    </div>
  );
}