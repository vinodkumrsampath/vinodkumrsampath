'use client';

import { useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';

type State = 'instructions' | 'camera' | 'uploading' | 'done';

export function SelfieStep({ onComplete }: { onComplete: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<State>('instructions');
  const [loading, setLoading] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setState('camera');
    } catch {
      toast.error('Camera access denied. Please allow camera access and try again.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const captureSelfie = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    stopCamera();
    setState('uploading');

    try {
      // Get upload URL from server
      const { uploadUrl, key } = await api.post('/verification/selfie/upload-url');

      // Convert canvas to blob and upload
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Canvas empty'))), 'image/jpeg', 0.9)
      );

      await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      // Confirm to server — runs liveness check
      const result = await api.post('/verification/selfie/confirm', { key });
      if (result.verified) {
        setState('done');
        toast.success('Selfie verified!');
        onComplete();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? 'Selfie verification failed');
      setState('instructions');
    } finally {
      setLoading(false);
    }
  }, [stopCamera, onComplete]);

  return (
    <div className="card p-8">
      {state === 'instructions' && (
        <div className="text-center">
          <div className="text-4xl mb-3">🤳</div>
          <h2 className="text-2xl font-bold mb-3">Take a selfie</h2>
          <p className="text-gray-600 mb-4">We'll use this to verify that your profile photos are really you.</p>
          <ul className="text-left text-gray-700 space-y-2 mb-6">
            <li className="flex gap-2 items-start"><span className="text-green-500 font-bold">✓</span> Look directly at the camera</li>
            <li className="flex gap-2 items-start"><span className="text-green-500 font-bold">✓</span> Good lighting on your face</li>
            <li className="flex gap-2 items-start"><span className="text-green-500 font-bold">✓</span> Remove sunglasses or hats</li>
          </ul>
          <button className="btn-primary w-full" onClick={startCamera}>Open Camera</button>
        </div>
      )}

      {state === 'camera' && (
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Position your face in the frame</h2>
          <div className="relative rounded-2xl overflow-hidden bg-black mb-4 aspect-[4/3]">
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" autoPlay muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-56 border-4 border-white rounded-full opacity-60" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <button className="btn-primary w-full" onClick={captureSelfie} disabled={loading}>
            Take Selfie
          </button>
          <button onClick={() => { stopCamera(); setState('instructions'); }} className="w-full text-gray-500 text-sm mt-3 hover:underline">
            Cancel
          </button>
        </div>
      )}

      {state === 'uploading' && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4 animate-pulse">🔍</div>
          <h2 className="text-xl font-bold mb-2">Verifying your selfie...</h2>
          <p className="text-gray-600">This takes just a moment</p>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
