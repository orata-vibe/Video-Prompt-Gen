
import React, { useState, useCallback, useRef } from 'react';
import { generatePromptFromVideo, PromptResult } from './services/geminiService';
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

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z" clipRule="evenodd" />
    </svg>
);

const STYLES = [
    { id: 'Cinematic', label: 'Cinematic (Film)' },
    { id: 'Photorealistic', label: 'Photorealistic (Nyata)' },
    { id: 'Anime', label: 'Anime / Kartun' },
    { id: '3D Render', label: '3D Render (Unreal Engine)' },
    { id: 'Cyberpunk', label: 'Cyberpunk / Neon' },
    { id: 'Vintage', label: 'Vintage / Retro' },
    { id: 'Dreamy', label: 'Dreamy / Surreal' },
];

const App: React.FC = () => {
    const [apiKey, setApiKey] = useState<string>('');
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [generatedResults, setGeneratedResults] = useState<PromptResult[]>([]);
    const [error, setError] = useState<string>('');
    const [allCopied, setAllCopied] = useState<boolean>(false);
    const [generationProgress, setGenerationProgress] = useState(0);
    const [numPromptsToGenerate, setNumPromptsToGenerate] = useState(5);
    const [creativityLevel, setCreativityLevel] = useState<number>(50);
    const [selectedStyle, setSelectedStyle] = useState<string>('Cinematic');
    const [userNegativePrompt, setUserNegativePrompt] = useState<string>('');
    const isStopping = useRef(false);
    
    const PROMPTS_PER_STAGE = 5;

    const handleVideoSelect = useCallback((file: File | null) => {
        setVideoFile(file);
        setGeneratedResults([]);
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

        isStopping.current = false;
        setIsLoading(true);
        setError('');
        setGeneratedResults([]);
        setGenerationProgress(0);
        
        // We keep track of existing prompts to encourage diversity
        let accumulatedPrompts: string[] = [];
        const totalStages = Math.ceil(numPromptsToGenerate / PROMPTS_PER_STAGE);

        try {
            for (let i = 0; i < totalStages; i++) {
                if (isStopping.current) break;

                setGenerationProgress(i + 1);
                
                const remainingPrompts = numPromptsToGenerate - accumulatedPrompts.length;
                const promptsForThisStage = Math.min(PROMPTS_PER_STAGE, remainingPrompts);

                const newResults = await generatePromptFromVideo(
                    videoFile, 
                    apiKey, 
                    accumulatedPrompts, 
                    promptsForThisStage,
                    selectedStyle,
                    userNegativePrompt,
                    creativityLevel / 100 // Normalize 0-100 to 0-1
                );

                const newPromptTexts = newResults.map(r => r.prompt);
                accumulatedPrompts = [...accumulatedPrompts, ...newPromptTexts];
                setGeneratedResults(prev => [...prev, ...newResults]);
            }
        } catch (err: any) {
            if (!isStopping.current) {
                setError(err.message || 'Gagal membuat prompt. Silakan coba lagi.');
            }
        } finally {
            setIsLoading(false);
            setGenerationProgress(0);
        }
    };

    const handleStop = () => {
        isStopping.current = true;
    };


    const handleCopyAll = () => {
        if (generatedResults.length === 0) return;

        const allPromptsText = generatedResults.map(res => res.prompt).join('\n\n');

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
                        Generator Prompt Video Pro
                    </h1>
                    <p className="text-gray-400 mt-4 text-lg">
                        Analisis video, pilih gaya, dan dapatkan prompt deskriptif yang presisi.
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

                    {/* Settings Panel */}
                     <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 shadow-lg space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Style Selector */}
                             <div className="col-span-1">
                                <label className="block text-sm font-medium text-gray-300 mb-3">
                                    Gaya Visual (Target Style)
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedStyle}
                                        onChange={(e) => setSelectedStyle(e.target.value)}
                                        className="block w-full rounded-lg border border-gray-600 bg-gray-800/50 py-2.5 px-4 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm appearance-none"
                                    >
                                        {STYLES.map(style => (
                                            <option key={style.id} value={style.id}>{style.label}</option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Prompt Count Slider */}
                             <div>
                                <label htmlFor="prompt-count" className="block text-sm font-medium text-gray-300 mb-3">
                                    Jumlah Prompt: <span className="font-bold text-indigo-400">{numPromptsToGenerate}</span>
                                </label>
                                <input
                                    id="prompt-count"
                                    type="range"
                                    min="1"
                                    max="20"
                                    value={numPromptsToGenerate}
                                    onChange={(e) => setNumPromptsToGenerate(parseInt(e.target.value, 10))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                 <div className="flex justify-between text-xs text-gray-500 mt-2">
                                    <span>1</span>
                                    <span>20</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Creativity Slider */}
                        <div>
                            <div className="flex justify-between mb-3">
                                <label htmlFor="creativity" className="block text-sm font-medium text-gray-300">
                                    Tingkat Kreativitas
                                </label>
                                <span className="text-sm font-bold text-indigo-400">{creativityLevel}%</span>
                            </div>
                            <input
                                id="creativity"
                                type="range"
                                min="0"
                                max="100"
                                value={creativityLevel}
                                onChange={(e) => setCreativityLevel(parseInt(e.target.value, 10))}
                                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Faktual/Akurat</span>
                                <span>Seimbang</span>
                                <span>Imajinatif (Tetap Relevan)</span>
                            </div>
                        </div>

                        {/* User Negative Prompt Input */}
                        <div>
                             <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300 mb-2">
                                Elemen yang Dihindari (Negative Prompt)
                            </label>
                            <input
                                type="text"
                                id="negative-prompt"
                                value={userNegativePrompt}
                                onChange={(e) => setUserNegativePrompt(e.target.value)}
                                placeholder="Contoh: watermark, orang, mobil, blur..."
                                className="block w-full rounded-lg border border-gray-600 bg-gray-800/50 py-2.5 px-4 text-white shadow-sm placeholder-gray-500 focus:border-red-500 focus:ring-red-500 sm:text-sm"
                            />
                             <p className="text-xs text-gray-500 mt-2">
                                Gemini akan menggunakan ini sebagai filter agar <strong>tidak</strong> mendeskripsikan elemen tersebut dalam hasil prompt.
                            </p>
                        </div>
                    </div>


                    <div className="flex justify-center">
                        <button
                            onClick={isLoading ? handleStop : handleGeneratePrompt}
                            disabled={!videoFile && !isLoading || !apiKey && !isLoading}
                            className={`flex items-center justify-center gap-3 px-8 py-4 font-semibold rounded-full shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 min-w-[280px] ${
                                isLoading
                                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <StopIcon className="w-6 h-6 animate-pulse" />
                                    <span>Hentikan ({generationProgress} / {totalStages})</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6" />
                                    <span>Buat Prompt {selectedStyle}</span>
                                </>
                            )}
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-900/50 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-center animate-fade-in">
                            <p><strong>Error:</strong> {error}</p>
                        </div>
                    )}

                    {generatedResults.length > 0 && (
                        <div className="space-y-6">
                             { !isLoading && (
                                <div className="flex justify-center -mb-2">
                                    <button
                                        onClick={handleCopyAll}
                                        className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-full transition-all duration-200 ${
                                            allCopied
                                                ? 'bg-green-600 text-white'
                                                : 'bg-gray-700 hover:bg-gray-600 text-white shadow-md border border-gray-500'
                                        }`}
                                    >
                                        {allCopied ? <CheckIcon className="w-5 h-5" /> : <CopyIcon className="w-5 h-5" />}
                                        {allCopied ? 'Semua Tersalin!' : 'Salin Semua ke Clipboard'}
                                    </button>
                                </div>
                            )}
                            {generatedResults.slice(0, numPromptsToGenerate).map((result, index) => (
                                <PromptDisplay key={index} result={result} index={index} />
                            ))}
                        </div>
                    )}
                </main>
                 <footer className="text-center mt-12 text-gray-500 text-sm">
                    <p>Didukung oleh Gemini API</p>
                </footer>
            </div>
             <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default App;
