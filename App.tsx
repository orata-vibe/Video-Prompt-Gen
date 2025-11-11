import React, { useState, useCallback } from 'react';
import { generatePromptFromVideo } from './services/geminiService';
import VideoUploader from './components/VideoUploader';
import PromptDisplay from './components/PromptDisplay';

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.75.75V6h1.5V5.25A.75.75 0 0112 4.5h.75a.75.75 0 01.75.75V6h1.5V5.25a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v1.5h1.5V6a.75.75 0 01.75-.75h.75a.75.75 0 01.75.75v1.5h.75a.75.75 0 010 1.5H21v.75a.75.75 0 01-1.5 0v-.75h-1.5v.75a.75.75 0 01-1.5 0V9h-1.5v.75a.75.75 0 01-1.5 0V9h-.75a.75.75 0 01-.75-.75V7.5h-1.5V9a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75V7.5H7.5V9a.75.75 0 01-1.5 0V7.5H4.5a.75.75 0 010-1.5h1.5V4.5H9z" clipRule="evenodd" />
        <path d="M6.166 12.834a.75.75 0 01.69.94l-1.124 3.122a.75.75 0 01-1.38-.498l1.124-3.122a.75.75 0 01.69-.442zM18.834 12.834a.75.75 0 01.69.442l1.124 3.122a.75.75 0 11-1.38.498l-1.124-3.122a.75.75 0 01.69-.94z" />
        <path fillRule="evenodd" d="M11.24 18.375a.75.75 0 01.75-.75h.02a.75.75 0 01.75.75v.02a.75.75 0 01-.75.75h-.02a.75.75 0 01-.75-.75v-.02zM14.24 18.375a.75.75 0 01.75-.75h.02a.75.75 0 01.75.75v.02a.75.75 0 01-.75.75h-.02a.75.75 0 01-.75-.75v-.02zM8.24 18.375a.75.75 0 01.75-.75h.02a.75.75 0 01.75.75v.02a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v-.02z" clipRule="evenodd" />
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const App: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [allCopied, setAllCopied] = useState<boolean>(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const TOTAL_STAGES = 4;

    const handleVideoSelect = useCallback((file: File | null) => {
        setVideoFile(file);
        setGeneratedPrompts([]);
        setError('');
        setGenerationProgress(0);

        if (videoPreviewUrl) {
            URL.revokeObjectURL(videoPreviewUrl);
        }

        if (file) {
            const url = URL.createObjectURL(file);
            setVideoPreviewUrl(url);
        } else {
            setVideoPreviewUrl(null);
        }
    }, [videoPreviewUrl]);

    const handleGeneratePrompt = async () => {
        if (!videoFile) return;

        setIsLoading(true);
        setError('');
        setGeneratedPrompts([]);
        setGenerationProgress(0);
        
        let accumulatedPrompts: string[] = [];

        try {
            for (let i = 0; i < TOTAL_STAGES; i++) {
                setGenerationProgress(i + 1);
                const newPrompts = await generatePromptFromVideo(videoFile, accumulatedPrompts);
                accumulatedPrompts = [...accumulatedPrompts, ...newPrompts];
                setGeneratedPrompts(prevPrompts => [...prevPrompts, ...newPrompts]);
            }
        } catch (err: any) {
            setError(err.message || 'Gagal membuat prompt. Silakan coba lagi.');
        } finally {
            setIsLoading(false);
            setGenerationProgress(0);
        }
    };

    const handleCopyAll = () => {
        if (generatedPrompts.length === 0) return;

        const allPromptsText = generatedPrompts.join('\n\n');

        navigator.clipboard.writeText(allPromptsText);
        setAllCopied(true);
        setTimeout(() => setAllCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-4xl">
                <header className="text-center mb-8 md:mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                        Generator Prompt Video AI
                    </h1>
                    <p className="text-gray-400 mt-4 text-lg">
                        Unggah video untuk menghasilkan 20 prompt kreatif dalam 4 tahap untuk kualitas maksimal.
                    </p>
                </header>

                <main className="space-y-8">
                    <VideoUploader
                        onFileSelect={handleVideoSelect}
                        previewUrl={videoPreviewUrl}
                    />

                    <div className="flex justify-center">
                        <button
                            onClick={handleGeneratePrompt}
                            disabled={!videoFile || isLoading}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 min-w-[240px]"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Membuat tahap {generationProgress} dari {TOTAL_STAGES}...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    <span>Buat 20 Prompt</span>
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center">
                            <p><strong>Error:</strong> {error}</p>
                        </div>
                    )}

                    {generatedPrompts.length > 0 && (
                        <div className="space-y-6">
                             { !isLoading && (
                                <div className="flex justify-center -mb-2">
                                    <button
                                        onClick={handleCopyAll}
                                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                                            allCopied
                                                ? 'bg-green-600 text-white'
                                                : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                                        }`}
                                    >
                                        {allCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        {allCopied ? 'Semua Tersalin!' : 'Salin Semua Prompt'}
                                    </button>
                                </div>
                            )}
                            {generatedPrompts.map((prompt, index) => (
                                <PromptDisplay key={index} prompt={prompt} index={index} />
                            ))}
                        </div>
                    )}
                </main>
                 <footer className="text-center mt-12 text-gray-500 text-sm">
                    <p>Didukung oleh Gemini API</p>
                </footer>
            </div>
        </div>
    );
};

export default App;