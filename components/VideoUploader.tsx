
import React, { useCallback, useState } from 'react';

interface VideoUploaderProps {
    onFileSelect: (file: File | null) => void;
    previewUrl: string | null;
}

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

const VideoUploader: React.FC<VideoUploaderProps> = ({ onFileSelect, previewUrl }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (files[0].type.startsWith('video/')) {
                onFileSelect(files[0]);
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
             if (files[0].type.startsWith('video/')) {
                onFileSelect(files[0]);
            }
        }
    };
    
    const handleRemoveVideo = () => {
        onFileSelect(null);
    }

    return (
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
            {previewUrl ? (
                <div className="relative group">
                    <video
                        src={previewUrl}
                        controls
                        className="w-full h-auto max-h-96 rounded-lg shadow-inner"
                    >
                        Browser Anda tidak mendukung tag video.
                    </video>
                    <button
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove video"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            ) : (
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-12 text-center transition-colors duration-300 ${isDragging ? 'border-indigo-400 bg-indigo-900/20' : 'border-gray-500 hover:border-gray-400'}`}
                >
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="video-upload"
                    />
                    <label htmlFor="video-upload" className="flex flex-col items-center justify-center space-y-4 cursor-pointer">
                        <UploadIcon className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-300">
                            <span className="font-semibold text-indigo-400">Klik untuk mengunggah</span> atau seret dan lepas
                        </p>
                        <p className="text-xs text-gray-500">Mendukung: MP4, MOV, WEBM, dll.</p>
                    </label>
                </div>
            )}
        </div>
    );
};

export default VideoUploader;
