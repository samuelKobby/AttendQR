import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, BookOpen } from 'lucide-react';
import { AddUserForm } from '@/components/forms/add-user-form';
import { AddClassForm } from '@/components/forms/add-class-form';

export function QuickActions() {
  const [showAddLecturerForm, setShowAddLecturerForm] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showAddClassForm, setShowAddClassForm] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setShowAddLecturerForm(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Add New Lecturer
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setShowAddStudentForm(true)}
          >
            <Users className="h-4 w-4 mr-2" />
            Add New Student
          </Button>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => setShowAddClassForm(true)}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            Create New Class
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Server Status</span>
            <span className="flex items-center text-green-600">
              <span className="h-2 w-2 bg-green-600 rounded-full mr-2"></span>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database Status</span>
            <span className="flex items-center text-green-600">
              <span className="h-2 w-2 bg-green-600 rounded-full mr-2"></span>
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Backup</span>
            <span className="text-sm text-gray-900">
              {new Date().toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Sessions</h3>
        <div className="space-y-4">
          {/* We'll fetch real data here later */}
          <div className="text-sm text-gray-500 text-center py-4">
            No upcoming sessions
          </div>
        </div>
      </div>

      {showAddLecturerForm && (
        <AddUserForm
          role="lecturer"
          onClose={() => setShowAddLecturerForm(false)}
          onSuccess={() => setShowAddLecturerForm(false)}
        />
      )}

      {showAddStudentForm && (
        <AddUserForm
          role="student"
          onClose={() => setShowAddStudentForm(false)}
          onSuccess={() => setShowAddStudentForm(false)}
        />
      )}

      {showAddClassForm && (
        <AddClassForm
          onClose={() => setShowAddClassForm(false)}
          onSuccess={() => setShowAddClassForm(false)}
        />
      )}
    </div>
  );
}