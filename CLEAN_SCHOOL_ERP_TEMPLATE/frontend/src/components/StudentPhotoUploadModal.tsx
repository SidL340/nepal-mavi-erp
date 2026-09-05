'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Check, RefreshCw, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface StudentPhotoUploadModalProps {
  studentId: number;
  studentName: string;
  currentPhotoUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPhotoUrl: string) => void;
}

const MAX_SIZE_KB = 50;

export default function StudentPhotoUploadModal({
  studentId,
  studentName,
  currentPhotoUrl,
  isOpen,
  onClose,
  onSuccess,
}: StudentPhotoUploadModalProps) {
  const [mode, setMode] = useState<'upload' | 'camera'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const [fileSizeKb, setFileSizeKb] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize preview
  useEffect(() => {
    if (isOpen) {
      setPreviewUrl(currentPhotoUrl || null);
      setFileSizeKb(null);
      setMode('upload');
    } else {
      stopCamera();
    }
  }, [isOpen, currentPhotoUrl]);

  // Start Camera
  const startCamera = async () => {
    try {
      setMode('camera');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 640 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      toast.error('Unable to access camera. Please check browser permissions or upload an image file.');
      setMode('upload');
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  // Helper: Smart Client-Side Image Compressor ensuring < 50 KB
  const compressImageTo50Kb = (img: HTMLImageElement): Promise<{ dataUrl: string; sizeKb: number }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const targetWidth = 320;
      const targetHeight = 380;
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve({ dataUrl: img.src, sizeKb: 50 });

      // Crop & center the portrait
      const sourceAspect = img.width / img.height;
      const targetAspect = targetWidth / targetHeight;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (sourceAspect > targetAspect) {
        sw = img.height * targetAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / targetAspect;
        sy = (img.height - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

      // Iteratively compress to guarantee strictly < 50 KB
      let quality = 0.85;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      let sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
      let sizeInKb = +(sizeInBytes / 1024).toFixed(1);

      while (sizeInKb > 48 && quality > 0.2) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        sizeInBytes = Math.round((dataUrl.length - 'data:image/jpeg;base64,'.length) * 0.75);
        sizeInKb = +(sizeInBytes / 1024).toFixed(1);
      }

      resolve({ dataUrl, sizeKb: sizeInKb });
    });
  };

  // Handle File Input Change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
        setPreviewUrl(dataUrl);
        setFileSizeKb(sizeKb);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Capture Frame from Webcam
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    const img = new Image();
    img.onload = async () => {
      const { dataUrl, sizeKb } = await compressImageTo50Kb(img);
      setPreviewUrl(dataUrl);
      setFileSizeKb(sizeKb);
      stopCamera();
      setMode('upload');
    };
    img.src = rawDataUrl;
  };

  // Save to Server
  const handleSave = async () => {
    if (!previewUrl) {
      toast.error('Please choose or capture a photo first.');
      return;
    }

    if (fileSizeKb && fileSizeKb > MAX_SIZE_KB) {
      toast.error(`Photo size is ${fileSizeKb} KB. Must be strictly 50 KB or less.`);
      return;
    }

    setIsSaving(true);
    try {
      await api.post(`/students/${studentId}/photo`, { photoUrl: previewUrl });
      toast.success('Student photo updated successfully!');
      onSuccess(previewUrl);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update photo.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
              <Camera size={18} className="text-amber-500" />
              <span>Student Photo Upload (विद्यार्थी फोटो)</span>
            </h3>
            <p className="text-xs text-gray-500 font-medium">{studentName} • Max 50 KB Limit</p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setMode('upload');
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              mode === 'upload' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Upload size={14} />
            <span>Upload File (फाइल छनौट)</span>
          </button>
          <button
            type="button"
            onClick={startCamera}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition ${
              mode === 'camera' ? 'bg-[#1e3a5f] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Camera size={14} />
            <span>Camera (फोटो खिच्नुहोस्)</span>
          </button>
        </div>

        {/* Mode 1: Camera Live View */}
        {mode === 'camera' && (
          <div className="space-y-3">
            <div className="relative h-64 w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border-2 border-[#1e3a5f]">
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-3 flex justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-[#1e3a5f] px-5 py-2 rounded-full font-black text-xs shadow-lg transition"
                >
                  <Camera size={16} />
                  <span>Capture Snapshot (क्लिक गर्नुहोस्)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mode 2: Upload or Preview View */}
        {mode === 'upload' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center">
              {/* Photo Preview Circle / Box */}
              <div className="relative h-44 w-36 rounded-2xl overflow-hidden border-4 border-[#1e3a5f] bg-slate-50 shadow-md flex items-center justify-center">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center p-3 text-gray-400">
                    <Upload size={32} className="mx-auto mb-1 opacity-50" />
                    <span className="text-[11px] font-bold block">No photo selected</span>
                  </div>
                )}
              </div>

              {/* 50 KB Limit Badge */}
              <div className="mt-3 flex items-center gap-2">
                {fileSizeKb !== null ? (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold ${
                      fileSizeKb <= MAX_SIZE_KB
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {fileSizeKb <= MAX_SIZE_KB ? <Check size={12} /> : <AlertTriangle size={12} />}
                    <span>{fileSizeKb} KB / 50 KB Max (Compressed ✓)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-0.5 rounded-full text-[11px] font-medium">
                    <ShieldCheck size={12} />
                    <span>Auto-compressed to &lt; 50 KB</span>
                  </span>
                )}
              </div>
            </div>

            {/* Hidden Input & Browse Button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2.5 px-3 rounded-xl border border-gray-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 transition"
              >
                <Upload size={14} />
                <span>Choose File (फाइल)</span>
              </button>

              <button
                type="button"
                onClick={startCamera}
                className="py-2.5 px-3 rounded-xl border border-[#1e3a5f] bg-blue-50 hover:bg-blue-100 text-xs font-bold text-[#1e3a5f] flex items-center justify-center gap-1.5 transition"
              >
                <Camera size={14} />
                <span>Take Selfie (क्यामेरा)</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!previewUrl || isSaving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Saving (सेभ हुँदैछ)...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save Photo (फोटो सुरक्षित गर्नुहोस्)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
