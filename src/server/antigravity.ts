import { GoogleGenAI } from '@google/genai';

export interface AntigravityRunResult {
  success: boolean;
  interactionId?: string;
  environmentId?: string;
  output: string;
  stepsCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Checks if server-side Gemini/Antigravity is configured with an API key
 */
export function isAntigravityConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
}

/**
 * Executes a task using the official Google Antigravity Agent (antigravity-preview-09-2026)
 * through the Gemini Interactions API.
 */
export async function runAntigravityTask(
  prompt: string,
  options?: {
    systemInstruction?: string;
    timeout?: number;
  }
): Promise<AntigravityRunResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      output: '',
      stepsCount: 0,
      durationMs: 0,
      error: 'GEMINI_API_KEY não configurada no servidor. Configure a chave no ambiente do AI Studio para ativar o Antigravity.',
    };
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });

    // Antigravity Agent interaction inside Google-hosted sandboxed remote environment
    const interaction = await ai.interactions.create(
      {
        agent: 'antigravity-preview-09-2026',
        input: prompt,
        environment: 'remote',
      },
      { timeout: options?.timeout || 300000 }
    );

    // Collect full text output from chronological model_output steps
    let fullOutput = '';
    const steps = interaction.steps || [];
    for (const step of steps) {
      if (step.type === 'model_output') {
        const textContent = (step.content as any[])?.find((c: any) => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }

    if (!fullOutput && interaction.output_text) {
      fullOutput = interaction.output_text;
    }

    return {
      success: true,
      interactionId: interaction.id,
      environmentId: interaction.environment_id,
      output: fullOutput || 'Tarefa concluída pelo agente Antigravity sem texto de saída.',
      stepsCount: steps.length,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error('Antigravity execution error:', err);
    return {
      success: false,
      output: '',
      stepsCount: 0,
      durationMs: Date.now() - startTime,
      error: err.message || 'Falha ao executar tarefa com o agente Antigravity.',
    };
  }
}
