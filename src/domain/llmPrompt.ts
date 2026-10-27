const EXAMPLE = `{
  "schemaVersion": 1,
  "title": "Calculus – Integrals",
  "description": "Past exam questions, 2023",
  "language": "en",
  "questions": [
    {
      "question": "What is $\\\\int x\\\\,dx$?",
      "options": ["$x$", "$\\\\frac{x^2}{2} + C$", "$2x$", "$x^2$", "$\\\\ln x$"],
      "answer": "B",
      "explanation": "Power rule: $\\\\int x^n\\\\,dx = \\\\frac{x^{n+1}}{n+1} + C$ with $n = 1$."
    }
  ]
}`;

/**
 * Instructions the user pastes into ChatGPT/Claude together with their notes or PDF.
 * English on purpose: LLMs follow it reliably, and it tells them to keep the source language.
 */
export function buildLlmPrompt(): string {
  return `Turn the material I give you into a multiple-choice quiz for the Quizkit app.

Rules:
- Reply with only the JSON, nothing before or after it, no code fences.
- Use exactly this format ("schemaVersion" is always 1):

${EXAMPLE}

- Every question has 2 to 6 "options" (plain strings, without "A)" prefixes) and exactly one correct option.
- "answer" is the letter of the correct option: "A" for the first, "B" for the second, and so on.
- "explanation" is optional but helpful: say briefly why the answer is right.
- Write the questions, options and explanations in the same language as my material.
- If the material contains real exam questions, keep them word for word and in order.
- Math: use LaTeX inside $...$ (inline) or $$...$$ (on its own line). Inside JSON strings, double every backslash: write \\\\frac, \\\\sqrt, \\\\int, never \\frac.
- Do not use Markdown, HTML or images. Describe any figure in words if it is needed.
- If the material is long, include every question; do not stop early.

Here is my material:
`;
}
