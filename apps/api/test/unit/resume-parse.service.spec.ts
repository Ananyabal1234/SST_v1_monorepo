import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import {
  ResumeParseService,
  resolveResumeLlmConfig,
} from '../../src/candidates/resume-parse.service';
import * as resumeText from '../../src/candidates/resume-text.util';

vi.mock('../../src/candidates/resume-text.util', async (importOriginal) => {
  const actual = await importOriginal<typeof resumeText>();
  return {
    ...actual,
    extractResumeText: vi.fn(),
  };
});

function makeFile(
  name: string,
  mime: string,
  content = 'dummy',
): Express.Multer.File {
  const buffer = Buffer.from(content);
  return {
    fieldname: 'resume',
    originalname: name,
    encoding: '7bit',
    mimetype: mime,
    size: buffer.length,
    buffer,
    destination: '',
    filename: name,
    path: '',
    stream: null as any,
  };
}

describe('ResumeParseService', () => {
  beforeEach(() => {
    vi.mocked(resumeText.extractResumeText).mockReset();
  });

  it('extracts contact fields locally when OPENAI_API_KEY is missing', async () => {
    const config = {
      get: (key: string) => (key === 'OPENAI_API_KEY' ? '' : undefined),
    } as ConfigService;
    const service = new ResumeParseService(config);
    vi.mocked(resumeText.extractResumeText).mockResolvedValue(
      'Priya Shah priya.shah@example.com +91 9876543210 Java developer',
    );
    const result = await service.parseResume(
      makeFile('a.pdf', 'application/pdf', '%PDF-1.4 hello world resume'),
    );
    expect(result.email).toBe('priya.shah@example.com');
    expect(result.mobile).toContain('9876543210');
    expect(result.name).toBe('Priya Shah');
    expect(result.warnings[0]).toMatch(/not configured/i);
  });

  it('parses structured fields from OpenAI JSON', async () => {
    const config = {
      get: (key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test';
        if (key === 'OPENAI_RESUME_MODEL') return 'llama-3.1-8b-instant';
        return undefined;
      },
    } as ConfigService;
    const service = new ResumeParseService(config);
    vi.mocked(resumeText.extractResumeText).mockResolvedValue(
      'Jane Doe jane@example.com +1 555 0100 Senior engineer',
    );

    const create = vi.fn().mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: 'Jane Doe',
              email: 'Jane@Example.com',
              mobile: '+1 555 0100',
              remarks: 'Senior engineer with React experience',
            }),
          },
        },
      ],
    });
    service.setClientForTests({
      chat: { completions: { create } },
    } as any);

    const result = await service.parseResume(
      makeFile('jane.pdf', 'application/pdf', '%PDF-1.4 jane'),
    );
    expect(result.name).toBe('Jane Doe');
    expect(result.email).toBe('jane@example.com');
    expect(result.mobile).toBe('+1 555 0100');
    expect(result.remarks).toContain('Senior engineer');
    expect(result.warnings).toEqual([]);
    expect(create).toHaveBeenCalledOnce();
  });

  it('adds warnings when contact fields are missing', async () => {
    const config = {
      get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined),
    } as ConfigService;
    const service = new ResumeParseService(config);
    vi.mocked(resumeText.extractResumeText).mockResolvedValue(
      'Some resume body without contacts here',
    );
    service.setClientForTests({
      chat: {
        completions: {
          create: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    name: null,
                    email: null,
                    mobile: null,
                    remarks: null,
                  }),
                },
              },
            ],
          }),
        },
      },
    } as any);

    const result = await service.parseResume(
      makeFile('x.pdf', 'application/pdf', '%PDF-1.4 x'),
    );
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('falls back to local extraction when the LLM returns 401', async () => {
    const config = {
      get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined),
    } as ConfigService;
    const service = new ResumeParseService(config);
    vi.mocked(resumeText.extractResumeText).mockResolvedValue(
      'Amit Kumar amit.kumar@brickred.com 9876543210',
    );
    const err = Object.assign(new Error('Invalid API Key'), {
      status: 401,
      error: { message: 'Invalid API Key' },
    });
    service.setClientForTests({
      chat: { completions: { create: vi.fn().mockRejectedValue(err) } },
    } as any);

    const result = await service.parseResume(
      makeFile('amit.pdf', 'application/pdf', '%PDF-1.4 amit'),
    );
    expect(result.email).toBe('amit.kumar@brickred.com');
    expect(result.mobile).toContain('9876543210');
    expect(result.warnings[0]).toMatch(/API key|credits/i);
  });

  it('returns 503 when LLM fails and no contact fields can be extracted', async () => {
    const config = {
      get: (key: string) => (key === 'OPENAI_API_KEY' ? 'sk-test' : undefined),
    } as ConfigService;
    const service = new ResumeParseService(config);
    vi.mocked(resumeText.extractResumeText).mockResolvedValue(
      'Some resume body without contacts here at all really',
    );
    const err = Object.assign(new Error('Invalid API Key'), { status: 401 });
    service.setClientForTests({
      chat: { completions: { create: vi.fn().mockRejectedValue(err) } },
    } as any);

    await expect(
      service.parseResume(makeFile('x.pdf', 'application/pdf', '%PDF-1.4 x')),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('resolveResumeLlmConfig', () => {
  it('routes xAI keys away from Groq', () => {
    const resolved = resolveResumeLlmConfig({
      apiKey: 'xai-test-key',
      baseURL: 'https://api.groq.com/openai/v1',
      model: 'llama-3.1-8b-instant',
    });
    expect(resolved.baseURL).toBe('https://api.x.ai/v1');
    expect(resolved.model).toBe('grok-4.6');
    expect(resolved.warning).toMatch(/xAI/);
  });
});

describe('extractResumeText (.doc)', () => {
  it('rejects legacy .doc for parsing', async () => {
    const { extractResumeText } = await vi.importActual<
      typeof resumeText
    >('../../src/candidates/resume-text.util');
    await expect(
      extractResumeText(
        makeFile('old.doc', 'application/msword', 'not-a-real-doc'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
