import { NextRequest, NextResponse } from "next/server";
import { customerModel } from "@/lib/gemini";

export async function POST(_req: NextRequest) {
  try {
    const prompt = `
      あなたはメイクレッスン・サロンの顧客ペルソナ生成器です。
      トレーニング用に、具体的な悩みや背景を持つユニークな顧客を1人生成してください。

      【生成のルール】
      - 文脈: デパートのカウンターではなく、予約制のメイクレッスン・サロンに来店した設定です。
      - 性格: 控えめで、自分からペラペラと状況を話さないタイプを優先的に生成してください。
      - 表面的な悩み: 「一重をどうにかしたい」「垢抜けたい」など、抽象的な一言のみ。
      - 裏設定（隠れニーズ）: 「来月、元彼の結婚式がある」「就活で清潔感を出したい」など、具体的な動機。
      - 最初の一言: 挨拶と、表面的な悩みだけを伝えてください。

      以下のJSON形式で出力してください：
      {
        "basicInfo": {
          "age": "年齢層 (例: 20代)",
          "occupation": "職業",
          "lifestyle": "ライフスタイル"
        },
        "personality": {
          "type": "性格のタイプ (例: 控えめ、口下手)",
          "tone": "口調 (例: 丁寧だが最小限の返答)"
        },
        "surfaceNeed": "表面的な悩み (自分から最初に言うこと)",
        "hiddenNeed": "隠れニーズ (聞かれない限り言わないこと)",
        "initialImpression": "入店時、または開始時の最初の一言"
      }
      JSONのみを出力してください。日本語限定です。
    `;

    const result = await customerModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const persona = JSON.parse(text.replace(/```json|```/g, ""));

    return NextResponse.json(persona);
  } catch (error) {
    console.error("Persona generation error:", error);
    return NextResponse.json({ error: "Failed to generate persona" }, { status: 500 });
  }
}
