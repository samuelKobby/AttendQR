import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    name: classData.name || '',
    course_code: classData.course_code || '',
    location: classData.location || '',
    capacity: classData.capacity?.toString() || '0',
    schedule: classData.schedule || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Ensure capacity is a number
      const updateData = {
        name: formData.name.trim(),
        course_code: formData.course_code.trim(),
        location: formData.location.trim(),
        capacity: parseInt(formData.capacity) || 0,
        schedule: formData.schedule.trim()
      };

      console.log('Submitting update with:', updateData);
      await databaseService.updateClass(classData.id, updateData);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
          placeholder="Enter class name"
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
          placeholder="Enter course code"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          required
          placeholder="Enter classroom or online link"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="capacity">Class Capacity</Label>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          value={formData.capacity}
          onChange={handleChange}
          required
          placeholder="Enter maximum number of students"
          min="1"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule">Schedule</Label>
        <Input
          id="schedule"
          name="schedule"
          value={formData.schedule}
          onChange={handleChange}
          required
          placeholder="E.g., Mon, Wed 10:00 AM - 11:30 AM"
        />
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
        <Button 
          type="submit" 
          disabled={loading}
          className="bg-green-500 hover:bg-green-600"
        >
          {loading ? 'Updating...' : 'Update Class'}
        </Button>
      </div>
    </form>
  );
}
