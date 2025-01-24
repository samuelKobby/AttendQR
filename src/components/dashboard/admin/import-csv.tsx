import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ImportCSVProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportCSV({ onClose, onSuccess }: ImportCSVProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateRow = (row: string[]): boolean => {
    if (row.length !== 6) return false;
    const [date, time, , email, , ] = row;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    // Validate time format (HH:mm:ss)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;
    if (!timeRegex.test(time)) return false;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return false;
    
    return true;
  };

  const processCSV = async (text: string) => {
    try {
      // Split CSV into rows and clean up
      const rows = text
        .split('\n')
        .map(row => row.split(',').map(cell => cell.trim()))
        .filter(row => row.length === 6 && row.every(cell => cell !== ''));

      const headers = rows[0];
      const expectedHeaders = ['Date', 'Time', 'Student Name', 'Student Email', 'Class Name', 'Course Code'];
      
      // Validate headers
      if (!headers.every((header, i) => header.toLowerCase() === expectedHeaders[i].toLowerCase())) {
        throw new Error('Invalid CSV format. Please check the column headers.');
      }

      const data = rows.slice(1);
      const total = data.length;
      let processed = 0;
      let successful = 0;

      // Validate all rows before processing
      const invalidRows = data.filter(row => !validateRow(row));
      if (invalidRows.length > 0) {
        throw new Error(`Invalid data format in ${invalidRows.length} rows. Please check the CSV format.`);
      }

      for (const row of data) {
        try {
          const [date, time, , studentEmail, className, courseCode] = row;

          // Find student
          const { data: student, error: studentError } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('email', studentEmail)
            .single();

          if (studentError) {
            console.error(`Student not found: ${studentEmail}`);
            continue;
          }

          // Find class
          const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('name', className)
            .eq('course_code', courseCode)
            .single();

          if (classError) {
            console.error(`Class not found: ${className} (${courseCode})`);
            continue;
          }

          // Find or create session
          const { data: session, error: sessionError } = await supabase
            .from('class_sessions')
            .select('id')
            .eq('class_id', classData.id)
            .eq('start_time', `${date}T${time}`)
            .single();

          if (sessionError) {
            // Create new session
            const { data: newSession, error: createSessionError } = await supabase
              .from('class_sessions')
              .insert({
                class_id: classData.id,
                start_time: `${date}T${time}`,
                end_time: new Date(new Date(`${date}T${time}`).getTime() + 60 * 60 * 1000).toISOString(),
                active: false
              })
              .select()
              .single();

            if (createSessionError) throw createSessionError;
            
            // Create attendance record
            const { error: attendanceError } = await supabase
              .from('attendance_records')
              .insert({
                session_id: newSession.id,
                student_id: student.user_id,
                marked_at: `${date}T${time}`,
                signature: 'imported'
              });

            if (attendanceError) throw attendanceError;
          } else {
            // Create attendance record for existing session
            const { error: attendanceError } = await supabase
              .from('attendance_records')
              .insert({
                session_id: session.id,
                student_id: student.user_id,
                marked_at: `${date}T${time}`,
                signature: 'imported'
              });

            if (attendanceError) throw attendanceError;
          }

          successful++;
        } catch (error) {
          console.error('Error processing row:', error);
        }

        processed++;
        setProgress(Math.round((processed / total) * 100));
      }

      if (successful === 0) {
        throw new Error('No records were imported successfully.');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error processing CSV:', error);
      setError(error instanceof Error ? error.message : 'Failed to process CSV file');
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processCSV(text);
      };
      reader.onerror = () => {
        setError('Failed to read file. Please try again.');
        setLoading(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('Failed to read file. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Import Attendance Data</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {!loading && !success && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file with the following columns:
                <br />
                <code className="text-xs bg-gray-100 p-1 rounded">
                  Date (YYYY-MM-DD), Time (HH:mm:ss), Student Name, Student Email, Class Name, Course Code
                </code>
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <Button onClick={() => document.getElementById('csv-upload')?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Select CSV File
              </Button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </div>
        )}

        {loading && !success && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <p className="text-center text-gray-600">Processing file...</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-sm text-gray-500">{progress}% complete</p>
          </div>
        )}

        {success && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-lg font-medium text-green-600">Import Successful</p>
            <p className="text-sm text-gray-600">
              The attendance data has been imported successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}