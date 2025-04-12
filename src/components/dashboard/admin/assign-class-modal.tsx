import { useState, useEffect } from 'react';
import { X, Search, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { databaseService } from '@/services/database';
import toast from 'react-hot-toast';

interface Class {
  id: string;
  name: string;
  capacity: number;
  lecturer: string;
  availableSlots: number;
}

interface AssignClassModalProps {
  studentIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AssignClassModal({ studentIds, onClose, onSuccess }: AssignClassModalProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const availableClasses = await databaseService.getAvailableClasses();
      setClasses(availableClasses.filter(c => c.availableSlots >= studentIds.length));
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to fetch available classes');
    }
  };

  const handleAssign = async (classId: string, className: string) => {
    if (!window.confirm(`Are you sure you want to enroll ${studentIds.length} students in ${className}?`)) {
      return;
    }

    setLoading(true);
    try {
      const result = await databaseService.bulkAssignToClass(studentIds, classId);
      toast.success(
        `Successfully enrolled ${result.enrolled} students in ${result.className}` +
        (result.alreadyEnrolled > 0 ? ` (${result.alreadyEnrolled} were already enrolled)` : '')
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning students to class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to assign students to class');
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.lecturer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold">Assign to Class</h3>
              <p className="text-sm text-gray-500">
                Showing classes with {studentIds.length} or more available slots
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">Loading classes...</div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8">
                <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-gray-900">No Classes Found</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm
                    ? 'Try adjusting your search'
                    : 'No classes with sufficient capacity available'}
                </p>
              </div>
            ) : (
              filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <h4 className="font-medium">{cls.name}</h4>
                    <p className="text-sm text-gray-500">
                      Lecturer: {cls.lecturer} • Available: {cls.availableSlots}/{cls.capacity} slots
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssign(cls.id, cls.name)}
                    disabled={loading}
                    className="text-green-600 border-green-600 hover:bg-green-50"
                  >
                    Assign
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
