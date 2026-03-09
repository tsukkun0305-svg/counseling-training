import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp, setDoc, collection } from "firebase/firestore";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { messages, persona, sessionId } = await req.json();

    if (!db) {
      console.error("Firestore DB is not initialized");
      return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
    あなたはプロのメイクアップ接客講師です。
    以下の美容部員とお客様の会話記録を分析し、評価を行ってください。

    お客様設定:
    ${JSON.stringify(persona)}

    会話ログ:
    ${JSON.stringify(messages)}

    以下のJSON形式で出力してください：
    {
      "scores": { "listening": 数値(0-100), "empathy": 数値(0-100), "proposal": 数値(0-100) },
      "feedbacks": ["フィードバック1", "フィードバック2", "フィードバック3"],
      "hiddenNeedResults": { "revealed": 布林値, "description": "なぜその評価になったかの解説" },
      "summary": "全体的な講評"
    }
    `;

    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    // Save evaluation to Firestore and update session end time
    if (sessionId) {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        endTime: serverTimestamp(),
      });

      // Save evaluation as a sub-collection or separate doc
      await setDoc(doc(db, "evaluations", sessionId), {
        ...data,
        sessionId,
        createdAt: serverTimestamp(),
      });
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Evaluation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
