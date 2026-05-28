export function stripLlmJson(output: string): string {
  const m = output.match(/```(?:json)?\s*([\s\S]*?)```/s);
  return m ? m[1].trim() : output.trim();
}
