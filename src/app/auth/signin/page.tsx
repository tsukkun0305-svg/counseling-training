"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, User, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function SignIn() {
    const [mounted, setMounted] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth) {
            alert("Firebaseが初期化されていません。環境変数を確認してください。");
            return;
        }
        setLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
            router.refresh();
        } catch (error: any) {
            console.error("Firebase Sign-in error:", error);
            alert("ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-[100dvh] bg-[#0a0a0a] text-white flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-pink-500 to-violet-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg">
                        <LogIn className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">STAFF LOGIN</h1>
                    <p className="text-gray-500 text-xs mt-2 uppercase tracking-widest">Counseling Training System</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-pink-500 transition-colors outline-none"
                                placeholder="staff@example.com"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm focus:border-pink-500 transition-colors outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg disabled:opacity-50"
                    >
                        {loading ? "ログイン中..." : "ログイン"}
                        {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-4">
                    <Link href="/auth/signup" className="text-[10px] text-pink-500 font-bold uppercase tracking-widest hover:text-pink-400 transition-colors">
                        Create new staff account
                    </Link>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">
                        Please register your staff account
                    </p>
                </div>
            </motion.div>
        </main>
    );
}
