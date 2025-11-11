import { GoogleGenAI, Type } from "@google/genai";

const extractFramesFromVideo = (
  videoFile: File,
  numFrames: number = 16,
  quality: number = 0.8
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const videoUrl = URL.createObjectURL(videoFile);
    video.src = videoUrl;
    video.muted = true;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(videoUrl);
      return reject(new Error("Tidak dapat membuat konteks canvas."));
    }

    const frames: string[] = [];

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      if (duration <= 0) {
        URL.revokeObjectURL(videoUrl);
        return reject(new Error("Durasi video tidak valid."));
      }

      const interval = duration / numFrames;
      let currentTime = 0;

      const captureFrame = () => {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        // Ekstrak hanya data base64
        frames.push(dataUrl.split(",")[1]);
      };

      video.onseeked = () => {
        captureFrame();
        currentTime += interval;
        if (currentTime <= duration) {
          video.currentTime = currentTime;
        } else {
          URL.revokeObjectURL(videoUrl);
          resolve(frames);
        }
      };

      // Mulai proses seek
      video.currentTime = currentTime;
    };

    video.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        let errorMsg = 'Gagal memuat file video.';
        if (video.error) {
            switch(video.error.code) {
                case video.error.MEDIA_ERR_ABORTED:
                    errorMsg = 'Pemutaran video dibatalkan.';
                    break;
                case video.error.MEDIA_ERR_NETWORK:
                    errorMsg = 'Terjadi kesalahan jaringan saat memuat video.';
                    break;
                case video.error.MEDIA_ERR_DECODE:
                    errorMsg = 'Gagal mendekode video. File mungkin rusak atau tidak didukung.';
                    break;
                case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMsg = 'Format video tidak didukung.';
                    break;
                default:
                    errorMsg = 'Terjadi kesalahan tak terduga saat memuat video.';
            }
        }
        reject(new Error(errorMsg));
    };

    video.load();
  });
};

export const generatePromptFromVideo = async (videoFile: File, existingPrompts: string[] = []): Promise<string[]> => {
  if (!process.env.API_KEY) {
    throw new Error("Kunci API tidak ditemukan. Harap atur variabel lingkungan API_KEY.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const frames = await extractFramesFromVideo(videoFile);
    if (frames.length === 0) {
      throw new Error("Tidak dapat mengekstrak frame dari video.");
    }
    
    const imageParts = frames.map((frame) => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: frame,
      },
    }));

    let promptText = `Analisis urutan frame video ini. Jelaskan elemen kunci: subjek, tindakan, lingkungan, warna, dan suasana keseluruhan. Berdasarkan analisis Anda, buatlah daftar 5 prompt yang sangat detail dan kreatif yang dapat digunakan oleh model AI text-to-video untuk membuat video yang serupa atau terinspirasi. Prompt harus menggugah dan deskriptif. Balas HANYA dengan objek JSON yang berisi satu kunci "prompts" yang nilainya adalah larik string (5 prompt).`;

    if (existingPrompts.length > 0) {
      const existingPromptsText = existingPrompts.map(p => `- ${p}`).join('\n');
      promptText += `\n\nPENTING: Anda sedang dalam proses pembuatan multi-tahap. Harap buat 5 prompt BARU yang secara konseptual berbeda dari prompt yang sudah ada di daftar ini untuk memastikan keragaman:\n${existingPromptsText}`;
    }


    const contents = [
      {
        parts: [{ text: promptText }, ...imageParts],
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompts: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);
    if (!jsonResponse.prompts || !Array.isArray(jsonResponse.prompts) || jsonResponse.prompts.length === 0) {
        throw new Error("Format respons tidak valid dari API atau tidak ada prompt yang dihasilkan.");
    }

    return jsonResponse.prompts;

  } catch (error: any) {
    console.error("Kesalahan saat menghasilkan prompt:", error);
    if (error.message.includes("API key not valid")) {
        throw new Error("Kunci API tidak valid. Periksa kembali kunci Anda.");
    }
    throw new Error(error.message || "Gagal menghasilkan prompt dari video.");
  }
};