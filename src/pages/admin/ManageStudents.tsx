import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StudentForm } from '../../components/student/StudentForm';
import { BulkStudentUpload } from '../../components/student/BulkStudentUpload';
import { adminService } from '../../services/admin';
import type { StudentCreationData } from '../../services/database';
import { toast } from '../../components/ui/use-toast';

export function ManageStudents() {
  const { classId } = useParams<{ classId?: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>('manual');

  const handleAddStudent = async (data: Omit<StudentCreationData, 'temp_password'>) => {
    try {
      setIsLoading(true);
      await adminService.addStudent({
        ...data,
        temp_password: `${data.email.split('@')[0]}${Math.floor(1000 + Math.random() * 9000)}`,
        ...(classId ? { class_id: classId } : {})
      });
      toast({
        title: 'Success',
        description: 'Student added successfully',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add student',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async (students: StudentCreationData[]) => {
    try {
      setIsLoading(true);
      const results = await adminService.bulkAddStudents({
        students: students.map(student => ({
          ...student,
          ...(classId ? { class_id: classId } : {})
        }))
      });

      const successCount = results.successful.length;
      const failCount = results.failed.length;

      if (successCount > 0) {
        toast({
          title: 'Success',
          description: `Successfully added ${successCount} student${successCount === 1 ? '' : 's'}`,
          variant: 'default',
        });
      }

      if (failCount > 0) {
        toast({
          title: 'Warning',
          description: `Failed to add ${failCount} student${failCount === 1 ? '' : 's'}`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to process bulk upload',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {classId ? 'Add Students to Class' : 'Add Students'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add students {classId ? 'to this class ' : ''}manually or upload a CSV file
          </p>
        </div>

        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('manual')}
              className={`${
                activeTab === 'manual'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`${
                activeTab === 'bulk'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Bulk Upload
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'manual' ? (
            <StudentForm onSubmit={handleAddStudent} isLoading={isLoading} />
          ) : (
            <BulkStudentUpload onUpload={handleBulkUpload} isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  );
}
