import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { personaData } = await req.json();
    const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email! }
    });

    if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dbSession = await prisma.session.create({
        data: {
            userId: dbUser.id,
            personaData,
        }
    });

    return NextResponse.json(dbSession);
}
