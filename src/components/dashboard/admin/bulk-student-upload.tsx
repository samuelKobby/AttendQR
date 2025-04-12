import { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { databaseService } from '@/services/database';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

interface BulkStudentUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkStudentUpload({ onClose, onSuccess }: BulkStudentUploadProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Array<{
    id: string;
    name: string;
    capacity: number;
    lecturer: string;
    availableSlots: number;
  }>>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const availableClasses = await databaseService.getAvailableClasses();
        console.log('Available classes in BulkStudentUpload:', availableClasses); // Debug log
        setClasses(availableClasses || []);
      } catch (error) {
        console.error('Error loading classes in BulkStudentUpload:', error);
        toast.error('Failed to load classes');
      }
    };
    loadClasses();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedClass) {
      toast.error('Please select both a file and a class');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const { data } = await new Promise<{ data: any[] }>((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      if (!data.length) {
        throw new Error('No data found in file');
      }

      // Validate required fields
      const requiredFields = ['email', 'full_name'];
      const hasRequiredFields = requiredFields.every(field => 
        data[0].hasOwnProperty(field.toLowerCase()) || 
        data[0].hasOwnProperty(field.toUpperCase())
      );

      if (!hasRequiredFields) {
        throw new Error('CSV must contain email and full_name columns');
      }

      // Process students in batches
      const batchSize = 50;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        await databaseService.createStudents(batch.map(row => ({
          email: row.email || row.EMAIL,
          full_name: row.full_name || row.FULL_NAME,
          student_id: row.student_id || row.STUDENT_ID || null,
          class_id: selectedClass
        })));
      }

      toast.success(`Successfully added ${data.length} students`);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Bulk Upload Students</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="mb-4">
          <label htmlFor="class_id" className="block text-sm font-medium text-gray-700">
            Select Class *
          </label>
          <select
            id="class_id"
            name="class_id"
            value={selectedClass || ''}
            onChange={(e) => {
              console.log('Selected class in bulk upload:', e.target.value); // Debug log
              setSelectedClass(e.target.value);
            }}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            required
            disabled={loading}
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

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Upload CSV File *
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-green-600 hover:text-green-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-green-500">
                  <span>Upload a file</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">
                CSV with headers: email, full_name, student_id (optional)
              </p>
              {file && (
                <p className="text-sm text-gray-500">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !file || !selectedClass}>
            {loading ? 'Uploading...' : 'Upload Students'}
          </Button>
        </div>
      </form>
    </div>
  );
}
