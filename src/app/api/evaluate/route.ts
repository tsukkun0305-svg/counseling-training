import { NextRequest, NextResponse } from "next/server";
import { evaluatorModel } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { messages, persona, sessionId } = await req.json();

    const prompt = `
      あなたはメイクレッスン・サロンのプロ講師であり、スタッフのカウンセリング力を評価する試験官です。
      以下の対話ログを分析し、スタッフを厳格に評価してください。

      【顧客設定】
      設定: ${JSON.stringify(persona)}

      【対話ログ】
      ${messages.map((m: any) => `${m.role === 'user' ? 'サロンスタッフ' : '顧客'}: ${m.content}`).join('\n')}

      【評価のポイントと採点基準】
      1. 関係構築 (Relationship Building): 
         - 顧客の短い返答に対して適切に寄り添い、安心感を与え、話しやすい雰囲気を作れたか。
      2. ニーズ喚起 (Needs Awakening): 
         - 表面的な悩み（surfaceNeed）の解決だけでなく、その背景にある隠れた動機（hiddenNeed）を引き出せているか。
      3. 提案の網羅性 (Proposal Scope): 
         - 以下の2点以上を具体的に提案できているか。
           a) お客様が希望・相談した箇所への回答
           b) プロの（スタッフの）視点から提案・お勧めする箇所

      【出力形式】
      以下のJSON形式で回答してください：
      {
        "scores": {
          "listening": 0-100, // 関係構築の評価
          "empathy": 0-100,   // ニーズ喚起の評価
          "proposal": 0-100   // 提案の網羅性の評価
        },
        "feedbacks": [
          "『〇〇』という質問で、お客様の本当の悩みである『△△』を引き出すことに成功しています。",
          "お客様の希望されたアイメイクへの回答に加え、プロの視点から眉の形を提案できており、基準を満たしています。",
          ...
        ],
        "hiddenNeedResults": {
          "revealed": true/false,
          "description": "隠れニーズをどの程度引き出せたか、具体的な対話箇所に触れて述べてください。"
        },
        "summary": "総評"
      }
      必ずJSONのみを出力してください。
    `;

    const result = await evaluatorModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const evaluation = JSON.parse(text.replace(/```json|```/g, ""));

    // Save to DB if sessionId exists
    if (sessionId) {
      await prisma.evaluation.create({
        data: {
          sessionId,
          scoreListening: evaluation.scores.listening,
          scoreEmpathy: evaluation.scores.empathy,
          scoreProposal: evaluation.scores.proposal,
          feedback: evaluation.feedbacks.join("\n"),
          revealedNeed: evaluation.hiddenNeedResults.revealed,
          summary: evaluation.summary,
        }
      });
      await prisma.session.update({
        where: { id: sessionId },
        data: { endTime: new Date() }
      });
    }

    return NextResponse.json(evaluation);
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "Failed to evaluate" }, { status: 500 });
  }
}
