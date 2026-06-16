import { normalizePath } from "../pageContext";
import type {
  CommentImportResult,
  CommentReply,
  CommentStatus,
  CommentTarget,
  LocalComment,
  PageContext,
} from "../types";

interface ImportedCommentRecord {
  comment: LocalComment;
  hasUpdatedAt: boolean;
}

interface ParsedImport {
  records: ImportedCommentRecord[];
  total: number;
  invalid: number;
  errors: string[];
}

const SUPPORTED_IMPORT_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStatus(value: unknown): value is CommentStatus {
  return value === "open" || value === "resolved";
}

function parseDate(value: string | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function readString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isString(value) && value.trim()) {
      return value;
    }
  }

  return undefined;
}

function normalizePage(
  rawPage: unknown,
  rawComment: Record<string, unknown>,
  now: string,
): PageContext | null {
  const page = isRecord(rawPage) ? rawPage : {};
  const path =
    readString(page, ["path", "pathname"]) ??
    readString(rawComment, ["pathname", "path"]);

  if (!path) {
    return null;
  }

  const url =
    readString(page, ["url"]) ?? readString(rawComment, ["url"]) ?? "";

  return {
    path: normalizePath(path),
    route: readString(page, ["route"]) ?? normalizePath(path),
    url,
    origin: readString(page, ["origin"]) ?? "",
    title: readString(page, ["title"]) ?? "",
    capturedAt:
      readString(page, ["capturedAt"]) ??
      readString(rawComment, ["createdAt", "updatedAt"]) ??
      now,
  };
}

function normalizeTarget(
  rawTarget: unknown,
  page: PageContext,
  commentId: string,
  now: string,
): CommentTarget | null {
  if (!isRecord(rawTarget)) {
    return null;
  }

  if (
    !isRecord(rawTarget.selector) ||
    !isRecord(rawTarget.position) ||
    !isRecord(rawTarget.element)
  ) {
    return null;
  }

  return {
    ...(rawTarget as unknown as CommentTarget),
    version: 1,
    id: readString(rawTarget, ["id"]) ?? `${commentId}-target`,
    capturedAt: readString(rawTarget, ["capturedAt"]) ?? now,
    page: normalizePage(rawTarget.page, { pathname: page.path }, now) ?? page,
    selector: rawTarget.selector as unknown as CommentTarget["selector"],
    position: rawTarget.position as unknown as CommentTarget["position"],
    element: rawTarget.element as unknown as CommentTarget["element"],
  };
}

function normalizeReplies(rawReplies: unknown, now: string): CommentReply[] {
  if (!Array.isArray(rawReplies)) {
    return [];
  }

  return rawReplies
    .map((reply): CommentReply | null => {
      if (!isRecord(reply)) return null;
      const id = readString(reply, ["id"]);
      const text = readString(reply, ["text", "message"]);
      if (!id || !text) return null;

      return {
        ...(reply as unknown as CommentReply),
        id,
        text,
        createdAt: readString(reply, ["createdAt"]) ?? now,
        updatedAt:
          readString(reply, ["updatedAt"]) ??
          readString(reply, ["createdAt"]) ??
          now,
      };
    })
    .filter((reply): reply is CommentReply => reply !== null);
}

function normalizeImportedComment(
  value: unknown,
  now: string,
): ImportedCommentRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.version !== undefined && value.version !== 1) {
    return null;
  }

  const id = readString(value, ["id"]);
  const text = readString(value, ["text", "message"]);

  if (!id || !text) {
    return null;
  }

  const page = normalizePage(value.page, value, now);
  if (!page) {
    return null;
  }

  const target = normalizeTarget(value.target, page, id, now);
  if (!target) {
    return null;
  }

  const createdAt =
    readString(value, ["createdAt"]) ?? readString(value, ["updatedAt"]) ?? now;
  const updatedAtValue = readString(value, ["updatedAt"]);
  const hasUpdatedAt = Boolean(updatedAtValue);
  const updatedAt = updatedAtValue ?? createdAt;

  return {
    hasUpdatedAt,
    comment: {
      ...(value as unknown as LocalComment),
      version: 1,
      id,
      text,
      target,
      page,
      createdAt,
      updatedAt,
      status: isStatus(value.status) ? value.status : "open",
      replies: normalizeReplies(value.replies, now),
    } as LocalComment,
  };
}

function extractComments(input: unknown): {
  comments: unknown[] | null;
  errors: string[];
} {
  if (Array.isArray(input)) {
    return { comments: input, errors: [] };
  }

  if (!isRecord(input)) {
    return {
      comments: null,
      errors: ["Imported JSON must be an object or an array of comments."],
    };
  }

  if (
    input.schemaVersion !== undefined &&
    input.schemaVersion !== SUPPORTED_IMPORT_SCHEMA_VERSION
  ) {
    return {
      comments: null,
      errors: [
        `Unsupported Pinote import schemaVersion: ${String(input.schemaVersion)}.`,
      ],
    };
  }

  if (Array.isArray(input.comments)) {
    return { comments: input.comments, errors: [] };
  }

  if (isRecord(input.data) && Array.isArray(input.data.comments)) {
    return { comments: input.data.comments, errors: [] };
  }

  return {
    comments: null,
    errors: ["Imported JSON must contain a comments array."],
  };
}

function parseImport(input: unknown): ParsedImport {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let parsed = input;

  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input) as unknown;
    } catch {
      return {
        records: [],
        total: 0,
        invalid: 0,
        errors: ["Invalid JSON file. Pinote could not parse the import."],
      };
    }
  }

  const extracted = extractComments(parsed);
  errors.push(...extracted.errors);

  if (!extracted.comments) {
    return {
      records: [],
      total: 0,
      invalid: 0,
      errors,
    };
  }

  const records: ImportedCommentRecord[] = [];
  let invalid = 0;

  extracted.comments.forEach((comment) => {
    const normalized = normalizeImportedComment(comment, now);
    if (normalized) {
      records.push(normalized);
    } else {
      invalid += 1;
    }
  });

  if (invalid > 0) {
    errors.push(
      `${invalid} imported comment${invalid === 1 ? " was" : "s were"} skipped because the shape was unsupported.`,
    );
  }

  return {
    records,
    total: extracted.comments.length,
    invalid,
    errors,
  };
}

function shouldReplaceExisting(
  existing: LocalComment,
  imported: ImportedCommentRecord,
): boolean {
  if (!imported.hasUpdatedAt) {
    return false;
  }

  const importedTime = parseDate(imported.comment.updatedAt);
  const existingTime = parseDate(existing.updatedAt);

  if (importedTime === null) {
    return false;
  }

  if (existingTime === null) {
    return true;
  }

  return importedTime > existingTime;
}

export function mergeImportedComments(
  existingComments: LocalComment[],
  importedInput: unknown,
): CommentImportResult {
  const parsed = parseImport(importedInput);
  const byId = new Map<string, LocalComment>();
  let added = 0;
  let updated = 0;
  let skipped = parsed.invalid;

  for (const comment of existingComments) {
    byId.set(comment.id, comment);
  }

  for (const imported of parsed.records) {
    const existing = byId.get(imported.comment.id);

    if (!existing) {
      byId.set(imported.comment.id, imported.comment);
      added += 1;
      continue;
    }

    if (shouldReplaceExisting(existing, imported)) {
      byId.set(imported.comment.id, imported.comment);
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return {
    total: parsed.total,
    imported: added + updated,
    added,
    updated,
    skipped,
    invalid: parsed.invalid,
    comments: Array.from(byId.values()),
    errors: parsed.errors,
  };
}

export function importComments(importedInput: unknown): CommentImportResult {
  return mergeImportedComments([], importedInput);
}
