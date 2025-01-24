import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { QrCode, Calendar } from 'lucide-react';
import { QRScanner } from '@/components/attendance/qr-scanner';

export function StudentAttendance() {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<{
    sessionId: string;
    token: string;
  } | null>(null);

  const handleScan = (data: { sessionId: string; token: string }) => {
    setScannedData(data);
    setShowScanner(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Mark Attendance</h1>
          <p className="text-sm text-gray-500">Scan QR code to mark your attendance</p>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-full max-w-sm text-center">
              <Button
                onClick={() => setShowScanner(true)}
                className="w-full py-6 sm:py-8 text-base sm:text-lg"
                size="lg"
              >
                <QrCode className="h-6 w-6 sm:h-8 sm:w-8 mr-3 sm:mr-4" />
                Scan QR Code
              </Button>
              <p className="mt-4 text-sm text-gray-500">
                Point your camera at the QR code displayed by your lecturer
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold mb-4">Today's Schedule</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-sm sm:text-base">Database Systems</p>
                  <p className="text-xs sm:text-sm text-gray-500">09:00 AM - 11:00 AM</p>
                </div>
              </div>
              <Button size="sm" className="text-xs sm:text-sm">Mark</Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-sm sm:text-base">Web Development</p>
                  <p className="text-xs sm:text-sm text-gray-500">02:00 PM - 04:00 PM</p>
                </div>
              </div>
              <Button size="sm" className="text-xs sm:text-sm">Mark</Button>
            </div>
          </div>
        </div>
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Scan QR Code</h2>
            <QRScanner onScan={handleScan} />
            <Button
              onClick={() => setShowScanner(false)}
              className="w-full mt-4"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
