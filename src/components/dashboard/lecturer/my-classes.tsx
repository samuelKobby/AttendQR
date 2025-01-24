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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { CreateClassForm } from './create-class-form';

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
  const [classes, setClasses] = useState<Class[]>([]);
  const { authState } = useAuth();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('lecturer_id', authState.user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                <div className="p-2 bg-blue-50 rounded-full">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="h-4 w-4 mr-2" />
                  <span>{cls.total_students} Students</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{cls.schedule}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{cls.location}</span>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {}}
                >
                  <History className="h-4 w-4 mr-2" />
                  View History
                </Button>
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => {}}
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Take Attendance
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Class Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create New Class</h2>
            <CreateClassForm
              onClose={() => setShowCreateForm(false)}
              onSuccess={() => {
                setShowCreateForm(false);
                fetchClasses();
              }}
            />
          </div>
        </div>
      )}

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Classes Yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Get started by creating your first class
          </p>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="mt-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Class
          </Button>
        </div>
      )}
    </div>
  );
}