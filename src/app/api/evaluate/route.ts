import { NextRequest, NextResponse } from "next/server";
import { evaluatorModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { messages, persona } = await req.json();

    const prompt = `
      あなたはメイクレッスン・サロンのプロ講師であり、スタッフのカウンセリング力を評価する試験官です。
      以下の対話ログを分析し、スタッフを厳格に評価してください。

      【顧客設定】
      設定: ${JSON.stringify(persona)}

      【対話ログ】
      ${messages.map((m: any) => `${m.role === 'user' ? 'サロンスタッフ' : '顧客'}: ${m.content}`).join('\n')}

      【評価のポイント】
      1. ヒアリング力 (質問の具体性、"いつ・どこで・誰と"といった5W1Hの深掘り)
      2. 共感・信頼構築 (顧客の短い返答に対して適切に寄り添い、話しやすい雰囲気を作れたか)
      3. 目的の合致 (最終的に、表面的な悩みではなく、裏設定にある本当の目的に合わせた提案ができたか)
      ※自分から話さない顧客に対し、いかに粘り強く質の高い質問を投げかけ、本音を引き出せたかを重視してください。

      【出力形式】
      以下のJSON形式で回答してください：
      {
        "scores": {
          "listening": 0-100,
          "empathy": 0-100,
          "proposal": 0-100
        },
        "feedbacks": [
          "『〇〇』という質問は非常に具体的で、顧客のライフスタイルを引き出すことに成功しています。",
          "顧客が口を閉ざしている際、もう少し沈黙を恐れずに待つか、別の角度からの質問が必要でした。",
          ...
        ],
        "hiddenNeedResults": {
          "revealed": true/false,
          "description": "今回の裏設定は『〇〇』でした。スタッフが具体的にどの質問でこの核心に迫れたか（あるいはなぜ迫れなかったか）を述べてください。"
        },
        "summary": "総評"
      }
      必ずJSONのみを出力してください。
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
