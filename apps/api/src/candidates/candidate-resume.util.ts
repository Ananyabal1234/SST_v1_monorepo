import { BadRequestException } from '@nestjs/common';

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
};

const ALLOWED_MIMES = new Set(
  Object.values(EXTENSION_TO_MIME).flatMap((mimes) => mimes),
);

export function sanitizeFileName(name: string): string {
  const base = String(name || 'resume')
    .replace(/\\/g, '/')
    .split('/')
    .pop()!
    .replace(/[^\w.\-()+\s]/g, '_')
    .trim();
  return base || 'resume';
}

export function resumeFileExtension(name: string): string {
  const safe = sanitizeFileName(name);
  const idx = safe.lastIndexOf('.');
  if (idx < 0) return '';
  return safe.slice(idx + 1).toLowerCase();
}

function extensionOf(name: string): string {
  return resumeFileExtension(name);
}

export function validateResumeFile(file?: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('Resume file is required');
  }
  if (!file.buffer?.length) {
    throw new BadRequestException('Resume file is empty');
  }
  if (file.size > RESUME_MAX_BYTES) {
    throw new BadRequestException('Resume must be 5 MB or smaller');
  }

  const safeName = sanitizeFileName(file.originalname);
  const ext = extensionOf(safeName);
  const allowedForExt = EXTENSION_TO_MIME[ext];
  if (!allowedForExt) {
    throw new BadRequestException(
      'Resume must be a PDF, DOC, or DOCX file',
    );
  }

  const mime = String(file.mimetype || '').toLowerCase();
  if (mime && !ALLOWED_MIMES.has(mime)) {
    throw new BadRequestException(
      'Resume must be a PDF, DOC, or DOCX file',
    );
  }
  if (mime && !allowedForExt.includes(mime)) {
    // DOCX is sometimes reported as application/zip by clients.
    if (!(ext === 'docx' && mime === 'application/zip')) {
      throw new BadRequestException(
        'Resume file extension does not match its content type',
      );
    }
  }
}

export function normalizedResumeMeta(file: Express.Multer.File) {
  validateResumeFile(file);
  const resumeFileName = sanitizeFileName(file.originalname);
  const ext = extensionOf(resumeFileName);
  const resumeMimeType =
    EXTENSION_TO_MIME[ext]?.[0] || file.mimetype || 'application/octet-stream';
  return {
    resumeFileName,
    resumeMimeType,
    resumeSizeBytes: file.buffer.length,
    resumeData: new Uint8Array(file.buffer),
  };
}

export function resumeMetaFromCandidate(row: {
  resumeFileName?: string | null;
  resumeMimeType?: string | null;
  resumeSizeBytes?: number | null;
  resumeData?: Uint8Array | Buffer | null;
}) {
  const hasResume =
    Boolean(row.resumeFileName) ||
    (row.resumeData != null &&
      (Buffer.isBuffer(row.resumeData)
        ? row.resumeData.length > 0
        : row.resumeData.byteLength > 0));
  return {
    hasResume,
    resumeFileName: hasResume ? row.resumeFileName ?? null : null,
    resumeMimeType: hasResume ? row.resumeMimeType ?? null : null,
    resumeSizeBytes: hasResume ? row.resumeSizeBytes ?? null : null,
  };
}

export function stripResumeData<T extends { resumeData?: unknown }>(
  row: T,
): Omit<T, 'resumeData'> {
  const { resumeData: _omit, ...rest } = row;
  return rest;
}
