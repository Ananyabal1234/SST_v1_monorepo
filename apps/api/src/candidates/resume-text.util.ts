import { BadRequestException } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import {
  resumeFileExtension,
  sanitizeFileName,
  validateResumeFile,
} from './candidate-resume.util';

const MIN_TEXT_CHARS = 20;

export async function extractResumeText(
  file: Express.Multer.File,
): Promise<string> {
  validateResumeFile(file);
  const ext = resumeFileExtension(file.originalname);

  if (ext === 'doc') {
    throw new BadRequestException(
      'Resume parsing is not supported for .doc files. Please upload a PDF or DOCX.',
    );
  }

  let text = '';
  if (ext === 'pdf') {
    text = await extractPdfText(file.buffer);
  } else if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    text = result.value || '';
  } else {
    throw new BadRequestException(
      'Resume must be a PDF or DOCX file for parsing',
    );
  }

  const cleaned = text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim();
  if (cleaned.length < MIN_TEXT_CHARS) {
    throw new BadRequestException(
      'Could not extract enough text from the resume. Try a text-based PDF or DOCX (scanned images are not supported).',
    );
  }
  // Cap payload sent to the LLM.
  return cleaned.slice(0, 20_000);
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const NAME_STOP = new Set([
  'resume',
  'curriculum',
  'vitae',
  'cv',
  'objective',
  'profile',
  'summary',
  'contact',
  'email',
  'phone',
  'mobile',
  'address',
  'linkedin',
  'github',
]);

export type HeuristicContact = {
  name: string | null;
  email: string | null;
  mobile: string | null;
};

/** Best-effort contact extraction when the LLM is unavailable. */
export function extractContactHeuristics(text: string): HeuristicContact {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  const emailMatch = source.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;
  const mobile = extractMobile(source);
  const name = extractName(source, emailMatch?.index ?? -1);
  return { name, email, mobile };
}

function extractMobile(source: string): string | null {
  const patterns = [
    /\+91[\s-]?[6-9]\d{9}\b/,
    /\b[6-9]\d{9}\b/,
    /\+\d{1,3}[\s-]?(?:\d[\s-]?){8,14}\d/,
  ];
  for (const re of patterns) {
    const m = source.match(re);
    if (!m) continue;
    const digits = m[0].replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) continue;
    if (/^(19|20)\d{2}$/.test(digits)) continue;
    return m[0].replace(/\s+/g, ' ').trim();
  }
  return null;
}

function extractName(source: string, emailIndex: number): string | null {
  const prefix =
    emailIndex > 0 ? source.slice(0, emailIndex).trim() : source.slice(0, 80);
  const match = prefix.match(
    /^([A-Z][a-z.'-]+(?:\s+[A-Z][a-z.'-]+){1,3}|[A-Z][A-Z.'-]+(?:\s+[A-Z][A-Z.'-]+){1,3})/,
  );
  if (!match) return null;
  const name = match[1].replace(/\s+/g, ' ').trim();
  const first = name.split(/\s+/)[0]?.toLowerCase() || '';
  if (NAME_STOP.has(first) || name.length < 3 || name.length > 60) return null;
  if (/\d/.test(name)) return null;
  return name;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result?.text || '';
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

export function resumeDisplayName(file: Express.Multer.File): string {
  return sanitizeFileName(file.originalname);
}
