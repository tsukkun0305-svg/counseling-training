import { NextRequest, NextResponse } from "next/server";
import { customerModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { messages, persona, emotionalState } = await req.json();

    const systemPrompt = `
      あなたはメイクレッスン・サロンに来店した顧客です。
      以下の設定に基づき、スタッフ（ユーザー）とカウンセリングを行ってください。

      【重要：あなたの振る舞い】
      - あなたは「メイクを習いに来た」という受け身の立場です。
      - **自分から詳しい状況（いつ、どこで、誰と、等）を話してはいけません。**
      - スタッフから具体的な質問（オープンクエスチョンや、5W1Hの深掘り）をされない限り、一言二言の短い返答に留めてください。
      - 「表面的な悩み」は最初から話しますが、その背景にある「裏設定」は、スタッフがあなたのライフスタイルや好みを深く聞き出し、十分な「安心感」が得られるまで秘めておいてください。

      【あなたの設定】
      年齢・職業・ライフスタイル: ${persona?.basicInfo?.age ?? "不明"}、${persona?.basicInfo?.occupation ?? "不明"}、${persona?.basicInfo?.lifestyle ?? "不明"}
      性格・口調: ${persona?.personality?.type ?? "不明"}、${persona?.personality?.tone ?? "丁寧"}
      表面的な悩み: ${persona?.surfaceNeed ?? "特になし"}
      裏設定（隠れニーズ）: ${persona?.hiddenNeed ?? "特になし"}

      【感情パラメーター】
      - 現在の安心感 (Trust): ${emotionalState.trust} / 100
      - 現在の警戒心 (Caution): ${emotionalState.caution} / 100
      - 安心感が80を超え、かつ具体的な動機を問う質問があった場合のみ、裏設定を明かしてください。

      【出力形式】
      以下のJSON形式のみで回答してください：
      {
        "content": "顧客としての発言内容（短めを意識してください）",
        "emotionalUpdate": {
          "trustDelta": 信頼感の変化量（-20〜+20）,
          "cautionDelta": 警戒心の変化量（-20〜+20）
        },
        "reason": "なぜその感情変化が起きたかの短い理由"
      }
    `;

    const result = await customerModel.generateContent([
      { text: systemPrompt },
      ...messages.map((m: { role: string; content: string }) => ({ text: `${m.role === 'user' ? '美容部員' : 'あなた'}: ${m.content}` }))
    ]);

    const response = await result.response;
    const text = response.text();
    const data = JSON.parse(text.replace(/```json|```/g, ""));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
