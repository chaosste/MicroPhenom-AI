import { GoogleGenAI } from "@google/genai";
import { AnalysisResult } from "../types";

// Convert Blob to Base64 string
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:audio/wav;base64,")
      const base64Content = base64String.split(",")[1];
      resolve(base64Content);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const getWelcomeMessage = async (): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash"; 
  
  const prompt = `
  You are a warm, insightful micro-phenomenology research guide. 
  Address the user directly.
  Write a brief, welcoming message (max 50 words) for a user about to record an interview.
  1. Explain that the goal is to slow down and discover the specific "how" of a lived experience.
  2. Suggest they start by bringing to mind a single, concrete moment to explore.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text || "Welcome. Let's explore the micro-dimensions of your experience. Please start by identifying a specific moment you wish to investigate.";
  } catch (error) {
    console.error("Gemini Welcome Message Error:", error);
    return "Welcome. Let's explore the micro-dimensions of your experience. Please start by identifying a specific moment you wish to investigate.";
  }
};

export const analyzeTextTranscript = async (text: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelId = "gemini-2.5-flash";

  const prompt = `
  You are an expert micro-phenomenology researcher. Your task is to analyze the following text transcript of an interview.
  
  Perform the following steps:
  1. **Structure**: specific logical segments. If speaker labels are present in the text, use them. If not, infer 'Participant' or 'Subject'. Assign '00:00' to timestamps if they are missing.
  2. **Preprocessing**: Identify "satellite" information. In micro-phenomenology, satellites are comments, judgments, generalizations, context, or theoretical knowledge that is NOT the direct lived experience. Separate these.
  3. **Diachronic Analysis**: Identify the temporal evolution of the specific experience described. Break it down into sequential phases (the "film" of the experience).
  4. **Synchronic Analysis**: For the key moments, identify the sensory modalities (Visual, Auditory, Kinesthetic/Bodily, etc.) and how they appear (submodalities, e.g., "blurry image", "internal tension").
  5. **Suggestions**: Suggest 2-3 follow-up questions the interviewer could ask to deepen the evocation of the "how".

  Return the result in the following JSON format:
  {
    "transcriptSegments": [
      { "speaker": "Speaker Name", "text": "Segment text...", "timestamp": "00:00" }
    ],
    "summary": "Brief summary of the target experience...",
    "diachronicStructure": [
      { "phase": "Phase Name", "description": "What happened", "timestampEstimate": "approx time like 00:00" }
    ],
    "synchronicStructure": [
      { "modality": "Visual/Auditory/Kinesthetic/etc", "description": "Description of the sensation", "submodality": "specific quality" }
    ],
    "satellites": ["Satellite comment 1", "Satellite comment 2"],
    "suggestions": ["Question 1", "Question 2"]
  }

  TRANSCRIPT TEXT:
  ${text}
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Gemini Text Analysis Error:", error);
    throw error;
  }
};

export const analyzeInterview = async (audioBlob: Blob): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Audio = await blobToBase64(audioBlob);

  const modelId = "gemini-2.5-flash"; 

  const prompt = `
  You are an expert micro-phenomenology researcher. Your task is to analyze the following audio recording of an interview.
  
  Perform the following steps:
  1. **Transcription & Diarization**: Transcribe the interview verbatim. Identify speakers (e.g., 'Interviewer', 'Interviewee'). structure this as a list of segments.
  2. **Preprocessing**: Identify "satellite" information. In micro-phenomenology, satellites are comments, judgments, generalizations, context, or theoretical knowledge that is NOT the direct lived experience. Separate these.
  3. **Diachronic Analysis**: Identify the temporal evolution of the specific experience described. Break it down into sequential phases (the "film" of the experience).
  4. **Synchronic Analysis**: For the key moments, identify the sensory modalities (Visual, Auditory, Kinesthetic/Bodily, etc.) and how they appear (submodalities, e.g., "blurry image", "internal tension").
  5. **Suggestions**: Suggest 2-3 follow-up questions the interviewer could ask to deepen the evocation of the "how".

  Return the result in the following JSON format:
  {
    "transcriptSegments": [
      { "speaker": "Interviewer", "text": "Can you tell me...", "timestamp": "00:00" },
      { "speaker": "Interviewee", "text": "Well, it started when...", "timestamp": "00:15" }
    ],
    "summary": "Brief summary of the target experience...",
    "diachronicStructure": [
      { "phase": "Phase Name", "description": "What happened", "timestampEstimate": "approx time like 00:30" }
    ],
    "synchronicStructure": [
      { "modality": "Visual/Auditory/Kinesthetic/etc", "description": "Description of the sensation", "submodality": "specific quality" }
    ],
    "satellites": ["Satellite comment 1", "Satellite comment 2"],
    "suggestions": ["Question 1", "Question 2"]
  }
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav", // Assuming wav
              data: base64Audio,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    } else {
      throw new Error("No response text from Gemini");
    }
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};