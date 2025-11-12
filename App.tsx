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

const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H5v-2H3v-2H1.258a1 1 0 01-.97-1.243l1.258-7.5a1 1 0 01.97-1.243H15z" />
    </svg>
);


const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [error, setError] = useState<string>('');
    const [allCopied, setAllCopied] = useState<boolean>(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [numPromptsToGenerate, setNumPromptsToGenerate] = useState(10);
    
    const PROMPTS_PER_STAGE = 5;

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
        if (!videoFile || !apiKey) return;

        setIsLoading(true);
        setError('');
        setGeneratedPrompts([]);
        setGenerationProgress(0);
        
        let accumulatedPrompts: string[] = [];
        const totalStages = Math.ceil(numPromptsToGenerate / PROMPTS_PER_STAGE);

        try {
            for (let i = 0; i < totalStages; i++) {
                setGenerationProgress(i + 1);
                
                const remainingPrompts = numPromptsToGenerate - accumulatedPrompts.length;
                const promptsForThisStage = Math.min(PROMPTS_PER_STAGE, remainingPrompts);

                const newPrompts = await generatePromptFromVideo(videoFile, apiKey, accumulatedPrompts, promptsForThisStage);
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
    
    const totalStages = Math.ceil(numPromptsToGenerate / PROMPTS_PER_STAGE);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-800 text-white font-sans p-4 sm:p-6 lg:p-8">
            <div className="container mx-auto max-w-4xl">
                <header className="text-center mb-8 md:mb-12">
                    <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
                        Generator Prompt Video AI
                    </h1>
                    <p className="text-gray-400 mt-4 text-lg">
                        Unggah video, pilih jumlah prompt, dan biarkan AI menganalisisnya untuk Anda.
                    </p>
                </header>

                <main className="space-y-8">
                    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
                         <label htmlFor="api-key" className="block text-sm font-medium text-gray-300 mb-2">Kunci API Gemini Anda</label>
                         <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                               <KeyIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                id="api-key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="Masukkan kunci API Anda di sini"
                                className="block w-full rounded-md border-0 bg-white/5 py-2.5 pl-10 text-white shadow-sm ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-inset focus:ring-indigo-500 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                
                    <VideoUploader
                        onFileSelect={handleVideoSelect}
                        previewUrl={videoPreviewUrl}
                    />

                     <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg">
                        <label htmlFor="prompt-count" className="block text-sm font-medium text-gray-300 mb-3">
                            Jumlah Prompt yang Akan Dibuat: <span className="font-bold text-indigo-400">{numPromptsToGenerate}</span>
                        </label>
                        <input
                            id="prompt-count"
                            type="range"
                            min="1"
                            max="50"
                            value={numPromptsToGenerate}
                            onChange={(e) => setNumPromptsToGenerate(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>


                    <div className="flex justify-center">
                        <button
                            onClick={handleGeneratePrompt}
                            disabled={!videoFile || isLoading || !apiKey}
                            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-semibold rounded-full shadow-lg hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 min-w-[240px]"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Membuat tahap {generationProgress} dari {totalStages}...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    <span>Buat {numPromptsToGenerate} Prompt</span>
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
                            {generatedPrompts.slice(0, numPromptsToGenerate).map((prompt, index) => (
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