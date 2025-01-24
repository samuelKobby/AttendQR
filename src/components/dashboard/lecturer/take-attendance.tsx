import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  QrCode,
  Search,
  Filter,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  BookOpen,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/auth-context';
import { format } from 'date-fns';
import { QRGenerator } from '@/components/attendance/qr-generator';

interface Class {
  id: string;
  name: string;
  course_code: string;
  location: string;
  total_students: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  status: 'present' | 'late' | 'absent';
  marked_at?: string;
}

export function TakeAttendance() {
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
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
          <h1 className="text-xl sm:text-2xl font-bold">Take Attendance</h1>
          <p className="text-sm text-gray-500">Generate QR codes for your classes</p>
        </div>
      </div>

      {/* Class Selection */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 sm:p-6 border-b">
          <h2 className="text-lg font-semibold">Select Class</h2>
        </div>
        <div className="divide-y">
          {classes.map((cls) => (
            <div key={cls.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-full">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">{cls.name}</h3>
                    <p className="text-sm text-gray-500">{cls.course_code}</p>
                  </div>
                </div>
                <Button
                  variant={activeClassId === cls.id ? "secondary" : "default"}
                  className="w-full sm:w-auto"
                  onClick={() => setActiveClassId(cls.id === activeClassId ? null : cls.id)}
                >
                  {activeClassId === cls.id ? 'Session Active' : 'Start Session'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Session QR Code */}
      {activeClassId && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-lg font-semibold">Active Session QR Code</h2>
          </div>
          <div className="p-4 sm:p-6">
            <QRGenerator classId={activeClassId} sessionDuration={10} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {classes.length === 0 && (
        <div className="text-center py-12">
          <QrCode className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No Classes Available</h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a class first to start taking attendance
          </p>
          <Button
            onClick={() => {}}
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