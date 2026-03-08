import { NextRequest, NextResponse } from "next/server";
import { customerModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { messages, persona, emotionalState } = await req.json();

    const systemPrompt = `
      あなたはメイクアップカウンターに来店した顧客です。
      以下の設定を忠実に守って対話してください。

      【あなたの設定】
      年齢・職業・ライフスタイル: ${persona?.basicInfo?.age ?? "不明"}、${persona?.basicInfo?.occupation ?? "不明"}、${persona?.basicInfo?.lifestyle ?? "不明"}
      性格・口調: ${persona?.personality?.type ?? "不明"}、${persona?.personality?.tone ?? "丁寧"}
      表面的な悩み: ${persona?.surfaceNeed ?? "特になし"}
      裏設定（隠れニーズ）: ${persona?.hiddenNeed ?? "特になし"}

      【対話のルール】
      - 最初は「表面的な悩み」についてのみ話します。
      - ユーザー（美容部員）が計聴し、共感し、適切な質問（オープンクエスチョン等）を投げかけ、信頼関係が築けたと感じるまで「裏設定」は絶対に話さないでください。
      - 現在のあなたの「安心感」スコア: ${emotionalState.trust} (0-100)
      - 現在のあなたの「警戒心」スコア: ${emotionalState.caution} (0-100)
      - 信頼関係が深まると「安心感」が上がり、「警戒心」が下がります。安心感が80を超えたら、少しずつ本音（裏設定）を漏らしてください。

      【出力形式】
      以下のJSON形式で回答してください：
      {
        "content": "顧客としての発言内容",
        "emotionalUpdate": {
          "trustDelta": 信頼感の変化量（-20〜+20）,
          "cautionDelta": 警戒心の変化量（-20〜+20）
        },
        "reason": "なぜその感情変化が起きたかの短い理由（評価用）"
      }
    `;

    const result = await customerModel.generateContent([
      { text: systemPrompt },
      ...messages.map((m: any) => ({ text: `${m.role === 'user' ? '美容部員' : 'あなた'}: ${m.content}` }))
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
