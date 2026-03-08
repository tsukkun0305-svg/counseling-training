import { NextRequest, NextResponse } from "next/server";
import { evaluatorModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const { messages, persona } = await req.json();

        const prompt = `
      あなたはメイクアップアーティストのカウンセリングスキルを評価する専門家です。
      以下のロールプレイの対話ログを分析し、評価を行ってください。

      【顧客設定】
      設定: ${JSON.stringify(persona)}

      【対話ログ】
      ${messages.map((m: any) => `${m.role === 'user' ? '美容部員' : '顧客'}: ${m.content}`).join('\n')}

      【評価項目】
      1. 傾聴力 (質問の質、オープンクエスチョンの活用)
      2. 共感力 (寄り添う姿勢、相槌)
      3. 提案力 (専門知識のわかりやすさ、ニーズへの合致)

      【出力形式】
      以下のJSON形式で回答してください：
      {
        "scores": {
          "listening": 0-100,
          "empathy": 0-100,
          "proposal": 0-100
        },
        "feedbacks": [
          "『〇〇』という発言の際、否定から入ってしまったため、お客様が警戒してしまいました。『なるほど』と受け止めるのがベターです。",
          ...
        ],
        "hiddenNeedResults": {
          "revealed": true/false,
          "description": "今回の裏設定は『〇〇』でした。今回は引き出すことができた/できませんでした。"
        },
        "summary": "全体的な評価のまとめ"
      }
      必ずJSONのみを出力してください。言語は日本語です。
    `;

        const result = await evaluatorModel.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const evaluation = JSON.parse(text.replace(/```json|```/g, ""));

        return NextResponse.json(evaluation);
    } catch (error) {
        console.error("Evaluation error:", error);
        return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
    }
}
