"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bot, Send, ArrowRight, RefreshCw, BarChart, ChevronRight, Mic, Sparkles, Settings2 } from "lucide-react";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

// --- Types ---
type Persona = {
  basicInfo: { age: string; occupation: string; lifestyle: string };
  personality: { type: string; tone: string };
  surfaceNeed: string;
  hiddenNeed: string;
  initialImpression: string;
};

type Message = { role: "user" | "assistant"; content: string };

type Evaluation = {
  scores: { listening: number; empathy: number; proposal: number };
  feedbacks: string[];
  hiddenNeedResults: { revealed: boolean; description: string };
  summary: string;
};

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut as firebaseSignOut, User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const router = useRouter();

  const [step, setStep] = useState<"home" | "gacha" | "customize" | "chat" | "result">("home");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [customPersona, setCustomPersona] = useState({
    age: "30代",
    occupation: "会社員",
    lifestyle: "平日はオフィス勤務、週末は外出が多い",
    personality: "控えめ",
    tone: "丁寧だが最小限の返答",
    surfaceNeed: "垢抜けた印象にしたい",
    hiddenNeed: "来月、大切な友人の結婚式がある",
    initialImpression: "今日はよろしくお願いします。自分に似合うメイクがわからなくて..."
  });
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [emotionalState, setEmotionalState] = useState({ trust: 20, caution: 50 });
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);

  // --- Voice State ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [useVoice, setUseVoice] = useState(true);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthStatus("authenticated");
        // Check for admin role (simulated or via custom claims/firestore)
        if (currentUser.email === "admin@example.com") {
          setIsAdmin(true);
        }
      } else {
        setUser(null);
        setAuthStatus("unauthenticated");
        router.push("/auth/signin");
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-8">
        <RefreshCw className="w-12 h-12 text-pink-500 animate-spin mb-4" />
        <p className="text-pink-500 font-medium animate-pulse tracking-widest text-xs uppercase">Authenticating...</p>
      </div>
    );
  }

  // --- Handlers ---
  const unlockVoice = () => {
    if (typeof window === "undefined" || !useVoice) return;
    const uttr = new SpeechSynthesisUtterance("");
    uttr.volume = 0;
    window.speechSynthesis.speak(uttr);
  };

  const speak = (text: string) => {
    if (!useVoice || typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    const uttr = new SpeechSynthesisUtterance(text);
    uttr.lang = "ja-JP";
    uttr.rate = 1.2;
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes("Nanami") || v.name.includes("Google 日本語") || v.lang === "ja-JP");
    if (femaleVoice) uttr.voice = femaleVoice;

    uttr.onstart = () => setIsSpeaking(true);
    uttr.onend = () => setIsSpeaking(false);
    uttr.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(uttr);
  };


  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = "ja-JP";
        rec.continuous = true; // Stay active while button is held
        rec.interimResults = true;

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = (e: any) => {
          console.error("Speech error", e);
          setIsListening(false);
        };
        rec.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0].transcript)
            .join("");
          setInput(transcript);
        };
        setRecognition(rec);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert("音声認識非対応のブラウザです。");
      return;
    }
    if (isListening) {
      recognition.stop();
      if (input.trim()) {
        handleSendMessage(input);
      }
    } else {
      recognition.start();
    }
  };

  const startGacha = async () => {
    unlockVoice();
    setLoading(true);
    setStep("gacha");
    const res = await fetch("/api/persona", { method: "POST" });
    const data = await res.json();
    setPersona(data);
    setLoading(false);
  };

  const startChat = async () => {
    if (!persona || !user) return;
    unlockVoice();
    setMessages([]);
    setStep("chat");

    // Create session in Firestore
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        userName: user.displayName || user.email,
        personaData: JSON.stringify(persona),
        startTime: serverTimestamp(),
      });
      setCurrentSessionId(docRef.id);
    } catch (e) {
      console.error("Firestore Error:", e);
    }
  };

  const handleCustomStart = async () => {
    if (!user) return;
    const newPersona = {
      basicInfo: {
        age: customPersona.age,
        occupation: customPersona.occupation,
        lifestyle: customPersona.lifestyle
      },
      personality: {
        type: customPersona.personality,
        tone: customPersona.tone
      },
      surfaceNeed: customPersona.surfaceNeed,
      hiddenNeed: customPersona.hiddenNeed,
      initialImpression: customPersona.initialImpression
    };
    setPersona(newPersona);
    setMessages([]);
    setStep("chat");
    unlockVoice();

    // Create session in Firestore
    try {
      const docRef = await addDoc(collection(db, "sessions"), {
        userId: user.uid,
        userName: user.displayName || user.email,
        personaData: JSON.stringify(newPersona),
        startTime: serverTimestamp(),
      });
      setCurrentSessionId(docRef.id);
    } catch (e) {
      console.error("Firestore Error:", e);
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === "admin123") {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setAdminPassword("");
    } else {
      alert("パスワードが違います");
    }
  };

  const handleTitleClick = () => {
    const nextCount = titleTapCount + 1;
    if (nextCount >= 5) {
      setShowAdminLogin(true);
      setTitleTapCount(0);
    } else {
      setTitleTapCount(nextCount);
      // Reset count after 2 seconds of inactivity
      setTimeout(() => setTitleTapCount(0), 2000);
    }
  };

  const handleSendMessage = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { role: "user" as const, content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [...messages, userMsg], persona, emotionalState }),
      });
      const data = await res.json();

      if (data.content) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
        speak(data.content);
      }

      if (data.emotionalUpdate) {
        setEmotionalState((prev) => ({
          trust: Math.min(100, Math.max(0, prev.trust + (data.emotionalUpdate.trustDelta ?? 0))),
          caution: Math.min(100, Math.max(0, prev.caution + (data.emotionalUpdate.cautionDelta ?? 0))),
        }));
      }
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    setLoading(true);
    const res = await fetch("/api/evaluate", {
      method: "POST",
      body: JSON.stringify({ messages, persona, sessionId: currentSessionId }),
    });
    const data = await res.json();
    setEvaluation(data);
    setStep("result");
    setLoading(false);
  };

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white font-sans selection:bg-pink-500/30 overflow-hidden">
      <div className="max-w-md mx-auto h-[100dvh] flex flex-col transition-all duration-500 relative">

        {/* --- Home Step --- */}
        {step === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col justify-center items-center p-8 text-center"
          >
            <div className="absolute top-6 right-6">
              <button onClick={() => firebaseSignOut(auth)} className="text-[10px] font-bold text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Sign Out</button>
            </div>
            <div className="w-24 h-24 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-3xl mb-8 flex items-center justify-center shadow-2xl shadow-pink-500/20">
              <BarChart className="w-12 h-12 text-white" />
            </div>
            <div className="mb-2">
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-[0.2em]">Welcome, {user?.displayName || user?.email}</span>
            </div>
            <h1
              onClick={handleTitleClick}
              className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 mb-2 cursor-pointer select-none active:scale-95 transition-transform"
            >
              Counseling Trainer
            </h1>
            <p className="text-gray-400 mb-8 text-sm leading-relaxed">
              AI顧客を相手に、メイクアップの接客スキルを磨きましょう。<br />音声対話で、よりリアルなトレーニングが可能です。
            </p>

            {/* Admin Login Dialog */}
            {showAdminLogin && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 w-full bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col gap-3">
                <input
                  type="password"
                  placeholder="管理者パスワード"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="bg-black/50 border border-white/10 rounded-xl p-3 text-sm"
                />
                <button onClick={handleAdminLogin} className="bg-white text-black py-2 rounded-xl text-xs font-bold">認証する</button>
              </motion.div>
            )}

            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={startGacha}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group shadow-xl"
              >
                トレーニングを開始
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => setStep("customize")}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                >
                  <Settings2 className="w-5 h-5" />
                  お客様を詳細設定する (管理者用)
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* --- Gacha Step --- */}
        {step === "gacha" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 flex flex-col justify-center p-6"
          >
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 blur-3xl -z-10" />
              {loading ? (
                <div className="flex flex-col items-center gap-4 py-12">
                  <RefreshCw className="w-12 h-12 text-pink-500 animate-spin" />
                  <p className="text-pink-500 font-medium animate-pulse">お客様をご案内中...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-pink-500 font-bold tracking-widest text-xs uppercase">New Customer Arrival</div>
                  <h2 className="text-2xl font-bold">新しいお客様がご来店しました</h2>
                  <div className="space-y-4 pt-4 border-t border-white/5 text-gray-300">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">第一印象 / お悩み</span>
                      <p className="text-lg text-white font-medium italic">「{persona?.surfaceNeed}」</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">お客様属性</span>
                      <p className="text-sm">{persona?.basicInfo?.age} ・ {persona?.basicInfo?.occupation}</p>
                    </div>
                  </div>
                  <button
                    onClick={startChat}
                    className="w-full py-4 mt-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-pink-600/20"
                  >
                    カウンセリングを開始する
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* --- Chat Step --- */}
        {step === "chat" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header / Emotion Meter */}
            <div className="p-4 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-bold text-gray-400">SESSION IN PROGRESS</span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setUseVoice(!useVoice)}
                    className={`text-[10px] font-bold px-2 py-1 rounded border ${useVoice ? "border-pink-500 text-pink-500" : "border-gray-600 text-gray-600"}`}
                  >
                    {useVoice ? "VOICE ON" : "VOICE OFF"}
                  </button>
                  <button
                    onClick={endSession}
                    className="text-xs font-bold text-pink-500 hover:text-pink-400 transition-colors"
                  >
                    終了して採点へ
                  </button>
                </div>
              </div>
              <div className="space-y-3 px-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>安心感 (Trust)</span>
                    <span className={emotionalState.trust > 70 ? "text-green-400" : ""}>{emotionalState.trust}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${emotionalState.trust}%` }}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    <span>警戒心 (Caution)</span>
                    <span className={emotionalState.caution > 70 ? "text-red-400" : ""}>{emotionalState.caution}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-red-500/80"
                      initial={{ width: 0 }}
                      animate={{ width: `${emotionalState.caution}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth pb-32">
              {messages.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-20 opacity-30 text-center px-8">
                  <p className="text-sm">カウンセラー（あなた）から声をかけて開始してください。</p>
                </div>
              )}
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}
                >
                  {m.role === "assistant" && (
                    <div className={`w-8 h-8 rounded-full bg-[#1a1a1a] border ${isSpeaking ? "border-pink-500 shadow-[0_0_10px_rgba(219,39,119,0.3)]" : "border-white/10"} flex items-center justify-center text-gray-400 flex-shrink-0 transition-all`}>
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                    ? "bg-pink-600 text-white rounded-br-none shadow-lg shadow-pink-600/10"
                    : "bg-[#1a1a1a] text-gray-200 border border-white/5 rounded-bl-none shadow-xl"
                    }`}>
                    {m.content}
                  </div>
                  {m.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white flex-shrink-0">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center text-gray-500 text-xs px-10">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  入力中...
                </div>
              )}
            </div>

            {/* Input / Voice Bar */}
            <div className="p-4 border-t border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl absolute bottom-0 left-0 right-0 max-w-md mx-auto">
              <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-2xl px-2 py-2 shadow-2xl focus-within:border-pink-500/50 transition-colors">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-5 rounded-2xl transition-all active:scale-90 touch-none ${isListening ? "bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)]" : "bg-white/5 text-gray-400 hover:text-white"}`}
                >
                  <div className="flex items-center justify-center relative">
                    {isListening && <motion.div animate={{ scale: [1, 3, 1], opacity: [0.5, 0, 0.5] }} transition={{ repeat: Infinity, duration: 1.2 }} className="absolute w-full h-full bg-red-500 rounded-full blur-2xl -z-10" />}
                    <Mic className={`w-7 h-7 ${isListening ? "scale-125" : ""}`} />
                  </div>
                </button>
                <input
                  className="flex-1 bg-transparent border-none outline-none text-sm py-2 placeholder:text-gray-600 ml-2"
                  placeholder={isListening ? "音声を認識しています..." : "メッセージを入力..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                />
                <button
                  disabled={loading || !input.trim()}
                  onClick={() => handleSendMessage()}
                  className="p-3 bg-pink-600 hover:bg-pink-500 rounded-xl transition-all disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="mt-2 text-[10px] text-center text-gray-500 font-bold uppercase tracking-widest flex justify-center items-center gap-2">
                {isListening ? (
                  <span className="flex items-center gap-1 text-red-500 animate-pulse">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    Listening... (Tap to Send)
                  </span>
                ) : isSpeaking ? (
                  <span className="text-pink-500">Customer Speaking...</span>
                ) : (
                  "Tap Mic to Start Speaking"
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Result Step --- */}
        {step === "result" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex-1 h-full overflow-y-auto p-6 space-y-8 pb-12"
          >
            <div className="text-center space-y-2 mt-4">
              <div className="text-pink-500 font-bold tracking-widest text-[10px] uppercase">Session Results</div>
              <h2 className="text-3xl font-black">カウンセリング結果</h2>
            </div>

            {/* Radar Chart */}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 shadow-2xl">
              <div className="h-64 flex items-center justify-center">
                {evaluation && (
                  <Radar
                    data={{
                      labels: ["傾聴力", "共感力", "提案力"],
                      datasets: [{
                        label: 'あなたのスキル',
                        data: [evaluation.scores.listening, evaluation.scores.empathy, evaluation.scores.proposal],
                        backgroundColor: 'rgba(219, 39, 119, 0.2)',
                        borderColor: 'rgb(219, 39, 119)',
                        pointBackgroundColor: 'rgb(219, 39, 119)',
                        pointBorderColor: '#fff',
                      }]
                    }}
                    options={{
                      scales: {
                        r: {
                          angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                          grid: { color: 'rgba(255, 255, 255, 0.1)' },
                          pointLabels: { color: '#888', font: { size: 12 } },
                          ticks: { display: false, count: 5 },
                          suggestedMin: 0,
                          suggestedMax: 100
                        }
                      },
                      plugins: { legend: { display: false } }
                    }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="text-center bg-white/5 p-3 rounded-2xl">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">傾聴</div>
                  <div className="text-xl font-bold">{evaluation?.scores?.listening ?? 0}</div>
                </div>
                <div className="text-center bg-white/5 p-3 rounded-2xl">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">共感</div>
                  <div className="text-xl font-bold">{evaluation?.scores?.empathy ?? 0}</div>
                </div>
                <div className="text-center bg-white/5 p-3 rounded-2xl">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">提案</div>
                  <div className="text-xl font-bold">{evaluation?.scores?.proposal ?? 0}</div>
                </div>
              </div>
            </div>

            {/* Hidden Needs Reveal */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-[#251a25] border border-pink-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
              <div className="text-xs font-bold text-pink-500 uppercase mb-3 flex items-center gap-2">
                <RefreshCw className="w-3 h-3" />
                隠れニーズ（答え合わせ）
              </div>
              <p className="text-white text-lg font-medium leading-relaxed italic mb-4">
                「{persona?.hiddenNeed}」
              </p>
              <div className={`text-xs px-3 py-1.5 inline-block rounded-full font-bold ${evaluation?.hiddenNeedResults?.revealed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                {evaluation?.hiddenNeedResults?.revealed ? "✓ ニーズを引き出せました" : "✗ ニーズに届きませんでした"}
              </div>
              <p className="text-sm text-gray-400 mt-4 leading-relaxed">
                {evaluation?.hiddenNeedResults?.description ?? "評価中..."}
              </p>
            </div>

            {/* Feedbacks (Red Pen) */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">具体的な改善・アドバイス</div>
              {evaluation?.feedbacks.map((f, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-white/5 p-5 rounded-2xl flex gap-4">
                  <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-sm text-gray-300 leading-relaxed font-medium">{f}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all shadow-xl mt-8"
            >
              ホームへ戻る
            </button>
          </motion.div>
        )}
      </div>
    </main>
  );
}
