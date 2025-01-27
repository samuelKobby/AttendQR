import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Camera, X } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: { sessionId: string; token: string }) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5Qrcode('qr-reader');

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      await scannerRef.current?.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          try {
            console.log('Raw QR code text:', decodedText);
            const url = new URL(decodedText);
            console.log('Parsed URL:', {
              full: url.toString(),
              pathname: url.pathname,
              search: url.search,
              params: Object.fromEntries(url.searchParams)
            });
            
            // Get session and token from URL parameters
            const sessionId = url.searchParams.get('session');
            const token = url.searchParams.get('token');

            console.log('Extracted session data:', { 
              sessionId, 
              token,
              hasSession: !!sessionId,
              hasToken: !!token
            });

            if (sessionId && token) {
              onScan({ sessionId, token });
              stopScanning();
            } else {
              console.error('Missing required parameters in QR code:', { 
                sessionId, 
                token,
                url: url.toString() 
              });
            }
          } catch (error) {
            console.error('Invalid QR code format:', {
              error,
              text: decodedText
            });
          }
        },
        undefined
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Scan QR Code</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopScanning}
            className="hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div id="qr-reader" className="mb-4"></div>

        <div className="flex justify-center gap-4">
          <Button onClick={startScanning} className="w-full">
            <Camera className="h-5 w-5 mr-2" />
            Start Camera
          </Button>
        </div>
      </div>
    </div>
  );
}