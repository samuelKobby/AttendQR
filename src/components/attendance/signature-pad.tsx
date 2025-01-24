import { useEffect, useRef } from 'react';
import SignaturePad from 'signature_pad';
import { Button } from '@/components/ui/button';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onChange: (signature: string) => void;
}

export function SignaturePadComponent({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
      });

      // Update signature data when changed
      signaturePadRef.current.addEventListener('endStroke', () => {
        onChange(signaturePadRef.current?.toDataURL() || '');
      });
    }

    return () => {
      signaturePadRef.current?.off();
    };
  }, [onChange]);

  const clearSignature = () => {
    signaturePadRef.current?.clear();
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full touch-none"
          width={400}
          height={200}
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearSignature}
        >
          <Eraser className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}