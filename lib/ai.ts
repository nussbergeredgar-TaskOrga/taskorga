import Anthropic from "@anthropic-ai/sdk";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function generateCrossSellSuggestion(context: string): Promise<string> {
  if (!anthropic) {
    throw new Error(
      "KI-Funktion ist noch nicht eingerichtet. Dazu muss serverseitig die Umgebungsvariable ANTHROPIC_API_KEY mit einem gültigen Anthropic-API-Key hinterlegt werden (z. B. in den Vercel-Projekteinstellungen)."
    );
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 600,
    messages: [{ role: "user", content: context }],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
