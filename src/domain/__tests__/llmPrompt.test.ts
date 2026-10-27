import { buildLlmPrompt } from '../llmPrompt';
import { extractJson } from '../normalizeInput';
import { parseQuizJson } from '../parseQuizJson';

describe('buildLlmPrompt', () => {
  const prompt = buildLlmPrompt();

  it('contains an example that imports cleanly', () => {
    const example = extractJson(prompt);
    expect(example).not.toBeNull();
    const result = parseQuizJson(example!);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings).toEqual([]);
  });

  it('documents the format', () => {
    expect(prompt).toContain('"schemaVersion": 1');
    expect(prompt).toContain('"answer": "B"');
  });

  it('asks for doubled backslashes, JSON only, and the source language', () => {
    expect(prompt).toMatch(/double every backslash/i);
    expect(prompt).toMatch(/only the JSON/i);
    expect(prompt).toMatch(/same language/i);
  });

  it('tells the AI to use typographic quotes inside text', () => {
    expect(prompt).toContain('“ ”');
  });
});
