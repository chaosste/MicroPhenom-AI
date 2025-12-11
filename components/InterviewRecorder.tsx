import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save, RefreshCw, HelpCircle, Info, Sparkles } from 'lucide-react';
import { MicrophoneVisualizer } from './MicrophoneVisualizer';
import { getWelcomeMessage } from '../services/geminiService';

interface Props {
  onSave: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const InterviewRecorder: React.FC<Props> = ({ onSave, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showGuide, setShowGuide] = useState(true);
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [isLoadingMessage, setIsLoadingMessage] = useState(true);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchWelcome = async () => {
      try {
        const msg = await getWelcomeMessage();
        if (mounted) setWelcomeMessage(msg);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setIsLoadingMessage(false);
      }
    };
    fetchWelcome();
    return () => { mounted = false; };
  }, []);

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        if (stream) stream.getTracks().forEach(track => track.stop());
        setStream(null);
        onSave(blob, duration);
      };
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Conduct Interview</h2>
          <p className="text-slate-500 text-sm">Focus on evoking the specific past experience.</p>
        </div>
        <div className="flex items-center gap-2 text-rose-500 font-mono text-xl font-bold bg-rose-50 px-4 py-2 rounded-lg">
          {isRecording && <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse mr-2" />}
          {formatTime(duration)}
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row">
        {/* Main Recording Area */}
        <div className="flex-1 p-8 flex flex-col items-center justify-center space-y-8 bg-slate-50">
          
          {/* AI Welcome Message */}
          <div className="max-w-xl w-full">
            {isLoadingMessage ? (
              <div className="flex flex-col items-center justify-center p-6 text-slate-400 gap-2 h-32">
                 <Sparkles size={20} className="animate-spin text-indigo-400" />
                 <span className="text-sm">Connecting to AI Guide...</span>
              </div>
            ) : (
               <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm relative mx-auto transform transition-all animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm border border-indigo-200">
                    <Sparkles size={12} /> AI Guide
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed italic text-center">
                    "{welcomeMessage}"
                  </p>
               </div>
            )}
          </div>

          <MicrophoneVisualizer stream={stream} isRecording={isRecording} />

          <div className="flex gap-6">
            {!isRecording ? (
              <button
                onClick={startRecording}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-20 h-20 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all group-hover:shadow-rose-200">
                  <Mic size={32} />
                </div>
                <span className="font-medium text-slate-600">Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-all">
                  <Square size={28} fill="currentColor" />
                </div>
                <span className="font-medium text-slate-600">Stop & Analyze</span>
              </button>
            )}
          </div>

          <div className="text-center max-w-md text-slate-500 text-sm">
            The session will be analyzed by Gemini AI immediately after stopping.
            Ensure you have provided the API Key.
          </div>
        </div>

        {/* Guidance Panel */}
        <div className={`w-full md:w-80 bg-white border-l border-slate-100 flex flex-col transition-all duration-300 ${showGuide ? 'translate-x-0' : 'translate-x-full hidden md:flex'}`}>
          <div className="p-4 border-b border-slate-100 bg-indigo-50 flex items-center gap-2">
            <HelpCircle size={18} className="text-indigo-600" />
            <span className="font-semibold text-indigo-900">Interviewer Guide</span>
          </div>
          
          <div className="p-4 overflow-y-auto space-y-6 flex-1">
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">The Goal</h3>
              <p className="text-sm text-slate-600">
                Help the interviewee <span className="font-bold text-indigo-600">evoke</span> a specific past moment. Move from "what" (content) to "how" (experience).
              </p>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Golden Rules</h3>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Ask <strong>HOW</strong> (process, feeling, sensory).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold">✗</span>
                  <span>Avoid <strong>WHY</strong> (causes justifications).</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500 font-bold">✓</span>
                  <span>Use their exact words (echoing).</span>
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Useful Prompts</h3>
              <div className="space-y-2">
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-200">
                  "When you say [word], what do you see/hear/feel?"
                </div>
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-200">
                  "Take your time to let the moment come back..."
                </div>
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-200">
                  "Where is that sensation located?"
                </div>
                <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 border border-slate-200">
                  "Is it a moving image or a still one?"
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};