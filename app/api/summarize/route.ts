import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MEETING_TYPES = ["standup", "strategy", "client call", "1-on-1", "other"] as const;
type MeetingType = (typeof MEETING_TYPES)[number];

const SYSTEM_PROMPT = `You are a professional meeting intelligence assistant. Given raw meeting notes or a transcript, produce:
1. Meeting Type — classify as EXACTLY one of these values: "standup", "strategy", "client call", "1-on-1", "other". Use "standup" for daily standups or scrums. Use "strategy" only for planning or roadmap sessions. Use "client call" for external customer or vendor calls. Use "1-on-1" for two-person check-ins. Use "other" for anything else.
2. Key Decisions (bullet points)
3. Action Items (per person — who, what, deadline if mentioned)
4. Topics Discussed (brief list)
5. Risk Flags (unresolved disagreements, missing owners, blockers — prefix with ⚠️)
6. Follow-Up Needed (anything left open)

If the output format is 'email', reformat as a professional follow-up email to meeting attendees.
If the output format is 'slack', reformat as a short casual update for a Slack channel.
Be concise and professional.

Always respond in valid JSON with this exact structure:
{
  "meetingType": "standup" | "strategy" | "client call" | "1-on-1" | "other",
  "keyDecisions": ["string"],
  "actionItems": [{ "person": "string", "task": "string", "deadline": "string or null" }],
  "topicsDiscussed": ["string"],
  "riskFlags": ["string"],
  "followUpNeeded": ["string"],
  "formattedOutput": "string (the full formatted output based on the requested format)"
}`;

function normalizeMeetingType(raw: string): MeetingType {
  const lower = raw.toLowerCase().trim();
  if (lower.includes("standup") || lower.includes("stand-up") || lower.includes("scrum")) return "standup";
  if (lower.includes("client") || lower.includes("customer") || lower.includes("vendor")) return "client call";
  if (lower.includes("1-on-1") || lower.includes("1:1") || lower.includes("one-on-one")) return "1-on-1";
  if (lower.includes("strategy") || lower.includes("planning") || lower.includes("roadmap")) return "strategy";
  if (MEETING_TYPES.includes(lower as MeetingType)) return lower as MeetingType;
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const { transcript, format } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }

    const validFormats = ["detailed", "email", "slack"];
    const outputFormat = validFormats.includes(format) ? format : "detailed";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Output format: ${outputFormat}\n\nMeeting transcript:\n${transcript}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: "No response from OpenAI" }, { status: 500 });
    }

    const result = JSON.parse(content);
    result.meetingType = normalizeMeetingType(result.meetingType ?? "");
    return NextResponse.json(result);
  } catch (err) {
    console.error("Summarize error:", err);
    return NextResponse.json({ error: "Failed to summarize transcript" }, { status: 500 });
  }
}
