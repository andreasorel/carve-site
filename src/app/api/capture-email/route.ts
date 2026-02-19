import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await request.json();
    const { email, url, score } = body as {
      email: string;
      url: string;
      score: number;
    };

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email" },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: "Carve <noreply@usecarve.co>",
      to: ["andreas@usecarve.co", "william@usecarve.co"],
      subject: "New score report request",
      text: `Score report requested:\n\nEmail: ${email}\nStore: ${url || "N/A"}\nScore: ${score || "N/A"}\nTimestamp: ${new Date().toISOString()}`,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Capture email error:", err);
    return NextResponse.json(
      { error: "Failed to save email" },
      { status: 500 }
    );
  }
}
