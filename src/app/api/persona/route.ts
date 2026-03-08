import { NextRequest, NextResponse } from "next/server";
import { customerModel } from "@/lib/gemini";

export async function POST(req: NextRequest) {
    try {
        const prompt = `
      You are a persona generator for a makeup counseling training app.
      Generate a unique customer persona with the following JSON structure:
      {
        "basicInfo": {
          "age": "e.g. 20s",
          "occupation": "e.g. Sales",
          "lifestyle": "e.g. Busy, outdoor-heavy"
        },
        "personality": {
          "type": "e.g. Talkative, Shy, Logical, Emotional",
          "tone": "e.g. Polite but distant"
        },
        "surfaceNeed": "The first problem they mention (e.g. Want to hide dark circles)",
        "hiddenNeed": "The real motivation they only reveal when they trust the artist (e.g. Partner commented on looking tired, lost confidence)",
        "initialImpression": "Greeting and the first sentence they say when entering the shop"
      }
      The output MUST be only the JSON.
      The language should be Japanese.
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
