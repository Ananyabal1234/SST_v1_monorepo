import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { z } from 'zod';
import {
  extractContactHeuristics,
  extractResumeText,
} from './resume-text.util';

const ParsedResumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  mobile: z.string().nullable(),
  remarks: z.string().nullable(),
});

export type ParsedResumeFields = {
  name: string | null;
  email: string | null;
  mobile: string | null;
  remarks: string | null;
  warnings: string[];
};

const SYSTEM_PROMPT = `You extract candidate contact details from resume text.
Return JSON with keys: name, email, mobile, remarks.
Rules:
- Use null when a value is missing or uncertain. Do not invent data.
- name: full person name only.
- email: a single email address if present.
- mobile: phone/mobile number as written (digits and leading + allowed).
- remarks: optional short summary (1-2 sentences) of skills/experience; null if unclear.
Respond with JSON only.`;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const XAI_BASE_URL = 'https://api.x.ai/v1';

export function resolveResumeLlmConfig(input: {
  apiKey: string;
  baseURL: string;
  model: string;
}): { apiKey: string; baseURL: string; model: string; warning?: string } {
  const apiKey = input.apiKey.trim();
  let baseURL = input.baseURL.trim();
  let model = input.model.trim();
  let warning: string | undefined;

  if (apiKey.startsWith('xai-')) {
    if (!baseURL || baseURL.includes('groq.com') || /api\.openai\.com/.test(baseURL)) {
      warning = `OPENAI_API_KEY looks like xAI but OPENAI_BASE_URL was ${baseURL || '(empty)'}; using ${XAI_BASE_URL}`;
      baseURL = XAI_BASE_URL;
    }
    if (!model || /llama|mixtral|gpt-|whisper/i.test(model)) {
      model = 'grok-4.6';
    }
  } else if (apiKey.startsWith('gsk_')) {
    if (!baseURL || baseURL.includes('x.ai') || /api\.openai\.com/.test(baseURL)) {
      warning = `OPENAI_API_KEY looks like Groq but OPENAI_BASE_URL was ${baseURL || '(empty)'}; using ${GROQ_BASE_URL}`;
      baseURL = GROQ_BASE_URL;
    }
    if (!model || /grok/i.test(model)) {
      model = 'llama-3.1-8b-instant';
    }
  }

  if (!model) {
    model = baseURL.includes('x.ai') ? 'grok-4.6' : 'llama-3.1-8b-instant';
  }

  return { apiKey, baseURL, model, warning };
}

@Injectable()
export class ResumeParseService {
  private readonly logger = new Logger(ResumeParseService.name);
  private client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const resolved = resolveResumeLlmConfig({
      apiKey: this.config.get<string>('OPENAI_API_KEY') || '',
      baseURL: this.config.get<string>('OPENAI_BASE_URL') || '',
      model: this.config.get<string>('OPENAI_RESUME_MODEL') || '',
    });
    this.model = resolved.model;
    this.client = resolved.apiKey
      ? new OpenAI({
          apiKey: resolved.apiKey,
          ...(resolved.baseURL ? { baseURL: resolved.baseURL } : {}),
        })
      : null;
    if (resolved.warning) {
      this.logger.warn(resolved.warning);
    }
    if (!this.client) {
      this.logger.warn(
        'OPENAI_API_KEY not set — resume parse will extract contact fields locally only',
      );
    } else if (resolved.baseURL) {
      this.logger.log(
        `Resume parse using OpenAI-compatible API at ${resolved.baseURL} (model=${this.model})`,
      );
    }
  }

  /** Injectable override for unit tests. */
  setClientForTests(client: OpenAI | null) {
    this.client = client;
  }

  async parseResume(file: Express.Multer.File): Promise<ParsedResumeFields> {
    const text = await extractResumeText(file);
    const heuristic = extractContactHeuristics(text);

    if (!this.client) {
      return heuristicResult(
        heuristic,
        'AI parsing is not configured. Filled contact fields from the resume text — please verify.',
      );
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Resume text:\n\n${text}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || '{}';
      let parsed: z.infer<typeof ParsedResumeSchema>;
      try {
        parsed = ParsedResumeSchema.parse(JSON.parse(raw));
      } catch (err) {
        this.logger.warn(`Failed to parse OpenAI resume JSON: ${String(err)}`);
        return heuristicResult(
          heuristic,
          'AI returned an unexpected response; filled contact fields from the resume text.',
        );
      }

      const warnings: string[] = [];
      const name = cleanNullable(parsed.name) || heuristic.name;
      const email = cleanNullable(parsed.email)?.toLowerCase() || heuristic.email;
      const mobile = cleanNullable(parsed.mobile) || heuristic.mobile;
      const remarks = cleanNullable(parsed.remarks);

      if (!name) warnings.push('Name not found in resume');
      if (!email) warnings.push('Email not found in resume');
      if (!mobile) warnings.push('Mobile not found in resume');

      return { name, email, mobile, remarks, warnings };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message =
        (err as { error?: { message?: string } })?.error?.message ||
        (err as Error)?.message ||
        'unknown error';
      this.logger.warn(`Resume parse LLM failed (${status ?? 'n/a'}): ${message}`);
      const hint =
        status === 401 || status === 403
          ? 'AI provider rejected the API key or has no credits.'
          : 'AI parsing is temporarily unavailable.';
      const fallback = heuristicResult(
        heuristic,
        `${hint} Filled contact fields from the resume text — please verify.`,
      );
      if (fallback.name || fallback.email || fallback.mobile) {
        return fallback;
      }
      throw new ServiceUnavailableException(
        `${hint} Fill the fields manually.`,
      );
    }
  }
}

function heuristicResult(
  heuristic: { name: string | null; email: string | null; mobile: string | null },
  notice: string,
): ParsedResumeFields {
  const warnings = [notice];
  if (!heuristic.name) warnings.push('Name not found in resume');
  if (!heuristic.email) warnings.push('Email not found in resume');
  if (!heuristic.mobile) warnings.push('Mobile not found in resume');
  return {
    name: heuristic.name,
    email: heuristic.email,
    mobile: heuristic.mobile,
    remarks: null,
    warnings,
  };
}

function cleanNullable(value: string | null | undefined): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t.length ? t : null;
}
