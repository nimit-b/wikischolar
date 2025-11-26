
import { AIConfig, ExamConfig } from '../types';

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openrouter',
  apiKey: '',
  model: 'google/gemma-3-27b-it:free',
  persona: 'High School Student',
  // Default Image config uses Puter
  useSeparateImageModel: true,
  imageModelProvider: 'puter',
  imageModel: 'gemini-2.5-flash-image-preview'
};

const SYSTEM_PROMPTS = {
  flashcards: (persona: string) => `You are an expert tutor for a ${persona}. Create 8 high-quality flashcards based on the provided text. Return ONLY a valid JSON array of objects with keys "front" and "back". Example: [{"front": "Question?", "back": "Answer"}]. Do NOT output any introductory text, markdown formatting, or code blocks.`,
  quiz: (persona: string) => `You are an exam creator for a ${persona}. Create 5 multiple-choice questions based on the text. Return ONLY a valid JSON array of objects with keys: "question", "options" (array of 4 strings), "correctAnswer", "explanation". Example: [{"question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "..."}].`,
  simplify: (persona: string) => `You are a helpful teacher. Explain the provided text simply and clearly for a ${persona}. Use bullet points and analogies. Output plain text ONLY.`,
  expand: (persona: string) => `You are a textbook author for a ${persona}. The user wants more detail on a specific section. Write a detailed, educational paragraph expanding on the context provided.`,
  real_world: (persona: string) => `Explain 3 real-world applications or examples related to this topic for a ${persona}.`,
  diagram: (persona: string) => `Generate a detailed educational diagram about: ${persona}. The image should be clear, labeled, and suitable for learning.`,
  custom: (persona: string) => `You are a helpful tutor for a ${persona}. Answer the user's specific request based on the provided text context.`,
  study_guide: (persona: string) => `You are a textbook author for a ${persona}. Create a comprehensive study guide.
  
  CRITICAL: You MUST return valid JSON.
  Structure:
  {
    "title": "Topic Title",
    "overview": "Summary paragraph...",
    "sections": [
      { "title": "Section Title (REQUIRED)", "content": "Detailed content with **bold** key terms and bullet points." }
    ],
    "keyPoints": ["Point 1", "Point 2"],
    "flashcards": [{"front": "Q", "back": "A"}],
    "quiz": [{"question": "Q", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "Why"}]
  }
  
  IMPORTANT: 
  - Do NOT use markdown images (e.g. ![alt](url)). Do NOT include external links.
  - If a visual is needed, explicitly write: "(Visual Note: Use the 'Visual Aid' button to generate a diagram of...)"
  - Ensure every section has a non-empty "title". Use Markdown for text formatting.`,
  exam_gen: (persona: string, config: ExamConfig) => `You are an examiner for a ${persona}. Create a ${config.difficulty} difficulty exam with ${config.questionCount} questions.
  Type: ${config.type}.
  
  If type is 'mcq', return JSON array: [{"type": "mcq", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "A", "explanation": "...", "marks": 1}]
  If type is 'short_answer', return JSON array: [{"type": "short_answer", "question": "...", "modelAnswer": "Expected answer...", "marks": 3}]
  If type is 'mixed', mix both types (Short answer should be 3-5 marks, MCQ 1 mark).
  
  Return ONLY the JSON array.`,
  grade_answer: (persona: string) => `You are a strict but fair teacher grading a student's answer.
  I will provide: Question, Model Answer, Student Answer, and Max Marks.
  You must compare the student's answer to the model answer.
  
  Return ONLY a JSON object: 
  { 
    "marksObtained": number (can be float, e.g., 2.5), 
    "feedback": "Brief explanation of what was right/wrong" 
  }
  Do not include any conversational text.`
};

const tryParseJSON = (str: string) => {
    try {
        return JSON.parse(str);
    } catch (e) {
        let fixed = str;
        fixed = fixed.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        fixed = fixed.replace(/,\s*([\]}])/g, '$1');
        try {
            return JSON.parse(fixed);
        } catch (e2) {
            console.error("Failed to parse JSON even after cleanup:", e2);
            return null;
        }
    }
};

export const generateWithAI = async (
  config: AIConfig,
  type: 'flashcards' | 'quiz' | 'simplify' | 'custom' | 'study_guide' | 'expand' | 'diagram' | 'real_world' | 'exam_gen' | 'grade_answer',
  contextText: string,
  customPrompt?: string | any
): Promise<any> => {
  
  // DETERMINE EFFECTIVE CONFIGURATION
  let effectiveProvider = config.provider;
  let effectiveApiKey = config.apiKey;
  let effectiveModel = config.model;
  let useImageProtocol = false;

  // Swap to image model credentials if this is a diagram request and feature is enabled
  if (type === 'diagram') {
      if (config.useSeparateImageModel) {
          effectiveProvider = config.imageModelProvider || 'puter';
          effectiveModel = config.imageModel || 'gemini-2.5-flash-image-preview';
          
          if (config.imageApiKey && config.imageApiKey.trim()) {
              effectiveApiKey = config.imageApiKey;
          }
      }
      
      // Default to Puter for new/default configs for diagrams if not explicitly set otherwise
      if (!config.useSeparateImageModel && !config.apiKey) {
           effectiveProvider = 'puter';
           effectiveModel = 'gemini-2.5-flash-image-preview';
      }

      if (effectiveProvider === 'openrouter' || effectiveProvider === 'puter') {
          useImageProtocol = true;
      }
  }

  // Check API Key ONLY if we aren't using Puter (which is free/keyless)
  const apiKey = effectiveApiKey ? effectiveApiKey.trim() : '';
  if (effectiveProvider !== 'puter' && !apiKey) throw new Error("API Key is missing. Please configure it in settings.");

  let prompt = '';
  let systemPrompt = '';

  if (type === 'custom') {
      prompt = `Task: ${customPrompt}\nContext:\n${contextText.substring(0, 4500)}`;
      systemPrompt = SYSTEM_PROMPTS.custom(config.persona);
  } else if (type === 'exam_gen') {
      const examConfig = customPrompt as ExamConfig;
      prompt = `Create a ${examConfig.questionCount} question exam on this topic. Difficulty: ${examConfig.difficulty}. Style: ${examConfig.type}.\nContext:\n${contextText.substring(0, 4500)}`;
      systemPrompt = SYSTEM_PROMPTS.exam_gen(config.persona, examConfig);
  } else if (type === 'grade_answer') {
      const data = customPrompt as { question: string, modelAnswer: string, userAnswer: string, marks: number };
      prompt = `Question: ${data.question}\nModel Answer: ${data.modelAnswer}\nStudent Answer: ${data.userAnswer}\nMax Marks: ${data.marks}`;
      systemPrompt = SYSTEM_PROMPTS.grade_answer(config.persona);
  } else if (type === 'diagram') {
      prompt = `Generate a detailed educational diagram about: ${contextText.substring(0, 500)}. Ensure clear labeling.`;
      systemPrompt = SYSTEM_PROMPTS.diagram(config.persona);
  } else {
      prompt = `Task: ${type.toUpperCase()}\nContext:\n${contextText.substring(0, 4500)}`;
      systemPrompt = SYSTEM_PROMPTS[type](config.persona);
  }

  // --- SPECIAL HANDLING FOR PUTER.JS (FREE IMAGE GEN) ---
  if (effectiveProvider === 'puter' && type === 'diagram') {
      try {
          // @ts-ignore - Puter is injected via script
          if (typeof window.puter === 'undefined') {
              throw new Error("Puter.js not loaded. Please refresh the page.");
          }
          // @ts-ignore
          const imgElement = await window.puter.ai.txt2img(prompt, { 
              model: effectiveModel 
          });
          
          // Puter returns an HTMLImageElement. extracting src (blob or base64)
          return imgElement.src;
          
      } catch (err: any) {
          console.error("Puter Image Gen Failed:", err);
          throw new Error("Failed to generate image with Puter: " + err.message);
      }
  }

  let endpoint = '';
  let headers: any = { 'Content-Type': 'application/json' };
  let body: any = {};

  if (effectiveProvider === 'openai' || effectiveProvider === 'openrouter' || effectiveProvider === 'custom') {
    endpoint = effectiveProvider === 'openai' ? 'https://api.openai.com/v1/chat/completions' :
                effectiveProvider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' :
                config.baseUrl || '';
    
    headers['Authorization'] = `Bearer ${apiKey}`;
    if (effectiveProvider === 'openrouter') {
      headers['HTTP-Referer'] = window.location.origin;
      headers['X-Title'] = 'WikiScholar';
    }

    // SPECIAL HANDLING FOR IMAGE GENERATION via OPENROUTER
    if (type === 'diagram' && effectiveProvider === 'openrouter' && useImageProtocol) {
         body = {
            model: effectiveModel.trim(),
            messages: [
                { role: 'user', content: prompt }
            ],
            // OpenRouter image gen usually works better as standard chat without 'modalities' key for some models
            // providing just the user message often triggers the image capability for configured models
         };
    } else {
        // Standard Text/Chat Generation
        body = {
            model: effectiveModel.trim(),
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: 0.5 
        };
    }

  } else if (effectiveProvider === 'gemini') {
    endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel.trim()}:generateContent?key=${apiKey}`;
    body = { contents: [{ parts: [{ text: `${systemPrompt}\n\nUser Query: ${prompt}` }] }] };
  } else {
    throw new Error(`Unsupported AI provider: ${effectiveProvider}`);
  }

  try {
    const response = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(body) });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error("Your API Key quota has been exceeded (429 Too Many Requests).");
        }
        if (response.status === 402) {
             throw new Error("Insufficient Credits (402). Try switching to 'Free (Puter.js)' in settings for images.");
        }
        if (response.status === 401) {
             throw new Error("Unauthorized (401). Check API Key.");
        }
        throw new Error(`AI API Error (${response.status})`);
    }

    const data = await response.json();
    let content = '';

    // Handle OpenRouter Image Protocol
    if (type === 'diagram' && effectiveProvider === 'openrouter') {
        // Different models return different structures. Some like DALL-E return data[0].url
        if (data.choices?.[0]?.message?.images) {
            const images = data.choices[0].message.images;
            if (images && images.length > 0) return images[0].image_url?.url || images[0].url;
        }
        // Check for created image url in other locations
        if (data.data && data.data[0]?.url) return data.data[0].url;
    }

    // Standard Response Parsing
    if (effectiveProvider === 'gemini') {
      content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else {
      content = data.choices?.[0]?.message?.content || '';
    }

    if (!content) throw new Error("AI returned empty content.");

    // Fallback: Check if the text content contains SVG code or Image URL
    if (type === 'diagram') {
        const urlMatch = content.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) return urlMatch[0];
        const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch) return svgMatch[0];
        return content;
    }

    if (['simplify', 'custom', 'expand', 'real_world'].includes(type)) return content.trim(); 
    
    // JSON Extraction
    content = content.replace(/```json/gi, '').replace(/```/g, '').replace(/\[\/s\]/g, '').replace(/[\x00-\x1F\x7F]/g, "").trim();
    let jsonString = content;
    const openSquare = jsonString.indexOf('[');
    const openCurly = jsonString.indexOf('{');
    let startIndex = -1;
    
    if (openSquare !== -1 && openCurly !== -1) startIndex = Math.min(openSquare, openCurly);
    else if (openSquare !== -1) startIndex = openSquare;
    else if (openCurly !== -1) startIndex = openCurly;

    if (startIndex !== -1) {
        jsonString = jsonString.substring(startIndex);
        const isArray = jsonString[0] === '[';
        const closer = isArray ? ']' : '}';
        const endIndex = jsonString.lastIndexOf(closer);
        if (endIndex !== -1) jsonString = jsonString.substring(0, endIndex + 1);
    }

    const parsed = tryParseJSON(jsonString);
    if (parsed) return parsed;
    
    throw new Error(`Could not extract valid JSON from AI response.`);

  } catch (error: any) {
    console.error("AI Generation failed:", error);
    throw new Error(error.message || "AI service returned an unknown error.");
  }
};