
import { GoogleGenAI, Type } from "@google/genai";

export interface PromptResult {
  prompt: string;
}

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
    let framesCaptured = 0;

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const duration = video.duration;
      if (duration <= 0) {
        URL.revokeObjectURL(videoUrl);
        return reject(new Error("Durasi video tidak valid."));
      }

      // Atur currentTime untuk memicu onseeked pertama kali
      video.currentTime = 0;
    };

    video.onseeked = () => {
        if (framesCaptured < numFrames) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            frames.push(dataUrl.split(",")[1]);
            framesCaptured++;

            if (framesCaptured < numFrames) {
                video.currentTime += (video.duration / numFrames);
            } else {
                URL.revokeObjectURL(videoUrl);
                resolve(frames);
            }
        }
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

export const generatePromptFromVideo = async (
    videoFile: File, 
    apiKey: string, 
    existingPrompts: string[] = [], 
    count: number = 5,
    style: string = "Cinematic",
    userNegativePrompt: string = "",
    creativity: number = 0.5
): Promise<PromptResult[]> => {
  if (!apiKey) {
    throw new Error("Kunci API diperlukan.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
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

    // Logic to determine instructions based on creativity level
    let creativityInstruction = "";
    let temperatureValue = 0.7; // Default

    if (creativity < 0.3) {
        // Low creativity: Strict, literal, factual
        temperatureValue = 0.2 + (creativity * 0.5); // Range 0.2 - 0.35
        creativityInstruction = "Fokus UTAMA pada deskripsi visual yang sangat akurat, faktual, dan literal. Jelaskan HANYA apa yang terlihat di layar. Hindari metafora atau bahasa bunga-bunga.";
    } else if (creativity > 0.7) {
        // High creativity: Artistic, evocative, but grounded
        temperatureValue = 0.7 + ((creativity - 0.7) * 0.6); // Range 0.7 - 0.88 (Capped < 0.9 to prevent hallucination)
        creativityInstruction = "Gunakan bahasa yang sangat artistik, sinematik, dan menggugah emosi. Anda boleh berimajinasi tentang atmosfer dan nuansa, TETAPI SANGAT PENTING untuk tetap setia pada subjek utama video. JANGAN mengubah topik (misal: jika bisnis, tetap bisnis, jangan ubah jadi hewan). Perkaya 'rasa' dari video tersebut.";
    } else {
        // Medium creativity: Balanced
        temperatureValue = 0.4 + (creativity * 0.4); // Range 0.4 - 0.6
        creativityInstruction = "Seimbangkan antara akurasi visual objektif dan penceritaan yang menarik. Gunakan kata sifat yang deskriptif namun tetap relevan dengan konten asli.";
    }

    let promptText = `Anda adalah prompt engineer AI kelas dunia untuk model text-to-video (seperti Sora, Runway, Pika).
    
TUGAS:
Analisis video yang diberikan dan buat ${count} variasi prompt deskriptif yang sangat detail dalam Bahasa Inggris.

GAYA VISUAL TARGET: ${style}
TINGKAT KREATIVITAS: ${Math.round(creativity * 100)}%
INSTRUKSI KREATIVITAS: ${creativityInstruction}

INSTRUKSI PENTING:
1. **Analisis Mendalam**: Perhatikan subjek, aksi, pencahayaan, pergerakan kamera, dan suasana.
2. **Penerapan Gaya**: Pastikan deskripsi mencerminkan gaya '${style}' yang diminta.
3. **Negative Constraint (SANGAT PENTING)**: Pengguna telah memberikan daftar hal yang HARUS DIHINDARI: "${userNegativePrompt || 'None'}".
   - JANGAN menyertakan, mendeskripsikan, atau menyinggung elemen-elemen tersebut dalam prompt Anda.
   - Gunakan input ini sebagai filter. Jika video asli mengandung elemen tersebut, abaikan atau ubah deskripsi agar sesuai dengan keinginan pengguna untuk menghilangkannya.
4. **Konsistensi Subjek**: Meskipun kreativitas tinggi, JANGAN pernah berhalusinasi tentang subjek yang sama sekali tidak ada (misal: jangan ubah video rapat kantor menjadi video hutan rimba).
5. **Output**: Hanya berikan teks prompt positif yang sudah difilter.

Format Output: JSON Object dengan kunci "results" berisi array objek { prompt }.`;

    if (existingPrompts.length > 0) {
      const existingPromptsText = existingPrompts.map(p => `- ${p}`).join('\n');
      promptText += `\n\nVARIASI: Harap buat prompt yang BERBEDA dari yang sudah ada berikut ini:\n${existingPromptsText}`;
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
        temperature: temperatureValue,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                    prompt: { type: Type.STRING }
                },
                required: ["prompt"]
              },
            },
          },
        },
      },
    });

    const jsonResponse = JSON.parse(response.text);
    if (!jsonResponse.results || !Array.isArray(jsonResponse.results) || jsonResponse.results.length === 0) {
        throw new Error("Format respons tidak valid dari API atau tidak ada prompt yang dihasilkan.");
    }

    return jsonResponse.results;

  } catch (error: any) {
    console.error("Kesalahan saat menghasilkan prompt:", error);
    if (error.message.includes("API key not valid") || error.message.includes("API key is invalid")) {
        throw new Error("Kunci API yang Anda berikan tidak valid. Silakan periksa kembali.");
    }
    throw new Error(error.message || "Gagal menghasilkan prompt dari video.");
  }
};
