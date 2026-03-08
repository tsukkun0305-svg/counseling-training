import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey);

export const customerModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
export const evaluatorModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
