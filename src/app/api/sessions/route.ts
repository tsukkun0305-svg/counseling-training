import { NextResponse } from "next/server";
import { db } from "@/lib/firebase"; // Note: This is client SDK, but for server-side we'd use admin SDK. 
// However, since we're using Vercel and for this simple use case, 
// we can use client SDK in a secure context or use firebase-admin.
// I'll stick to client SDK for simplicity if it works, or fix with admin later if needed.
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: Request) {
    try {
        const { userId, userName, personaData } = await req.json();

        if (!db) {
            console.error("Firestore DB is not initialized");
            return NextResponse.json({ error: "Database not initialized" }, { status: 500 });
        }

        // Since we now do this client-side in page.tsx, this route might be redundant,
        // but I'll keep it for better structure or if client-side Firestore is restricted.
        const docRef = await addDoc(collection(db, "sessions"), {
            userId,
            userName,
            personaData,
            startTime: serverTimestamp(),
        });

        return NextResponse.json({ id: docRef.id });
    } catch (error: unknown) {
        console.error("Firestore Session Error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
