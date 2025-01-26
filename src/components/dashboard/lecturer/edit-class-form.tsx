import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { databaseService } from '@/services/database';
import { toast } from 'sonner';
import type { Class } from '@/services/database';

interface EditClassFormProps {
  classData: Class;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditClassForm({ classData, onClose, onSuccess }: EditClassFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: classData.name,
    course_code: classData.course_code,
    description: classData.description || '',
    schedule: classData.schedule || '',
    location: classData.location || '',
    capacity: classData.capacity || 0,
    department: classData.department || '',
    semester: classData.semester || '',
    academic_year: classData.academic_year || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await databaseService.updateClass(classData.id, formData);
      toast.success('Class updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating class:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'capacity' ? parseInt(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Class Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="course_code">Course Code</Label>
        <Input
          id="course_code"
          name="course_code"
          value={formData.course_code}
          onChange={handleChange}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schedule">Schedule</Label>
          <Input
            id="schedule"
            name="schedule"
            value={formData.schedule}
            onChange={handleChange}
            placeholder="e.g., Mon/Wed 10:00-11:30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g., Room 101"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input
            id="capacity"
            name="capacity"
            type="number"
            value={formData.capacity}
            onChange={handleChange}
            min={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            name="department"
            value={formData.department}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="semester">Semester</Label>
          <Input
            id="semester"
            name="semester"
            value={formData.semester}
            onChange={handleChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="academic_year">Academic Year</Label>
          <Input
            id="academic_year"
            name="academic_year"
            value={formData.academic_year}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Class'}
        </Button>
      </div>
    </form>
  );
}
