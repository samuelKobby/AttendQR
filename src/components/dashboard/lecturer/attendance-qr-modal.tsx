import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRGenerator } from '@/components/attendance/qr-generator';

interface AttendanceQRModalProps {
  classId: string;
  className: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AttendanceQRModal({
  classId,
  className,
  isOpen,
  onClose,
}: AttendanceQRModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Take Attendance - {className}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 items-center justify-center">
          <QRGenerator classId={classId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
