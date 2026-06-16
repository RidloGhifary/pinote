import type {
  CommentExportOptions,
  CommentExportPageSummary,
  CommentExportPayload,
  CommentExportStatusFilter,
  LocalComment,
} from "../types";
import { COMMENT_IGNORE_ATTRIBUTE, PINOTE_UI_ATTRIBUTE } from "../types";

export const COMMENT_EXPORT_SCHEMA_VERSION = 1;
export const COMMENT_EXPORT_LIBRARY_NAME = "Pinote";
export const COMMENT_EXPORT_LIBRARY_VERSION = "0.1.1";

export interface CreateCommentExportInput {
  comments: LocalComment[];
  projectKey: string;
  currentPagePath?: string;
  options?: CommentExportOptions;
}

export interface DownloadCommentExportOptions {
  filename?: string;
  space?: number;
}

function getStatusFilter(
  status?: CommentExportStatusFilter,
): CommentExportStatusFilter {
  return status ?? "all";
}

function filterComments(
  comments: LocalComment[],
  currentPagePath: string,
  options: CommentExportOptions = {},
): LocalComment[] {
  const scope = options.scope ?? "all";
  const status = getStatusFilter(options.status);

  return comments.filter((comment) => {
    if (scope === "current-page" && comment.page.path !== currentPagePath) {
      return false;
    }

    if (status !== "all" && comment.status !== status) {
      return false;
    }

    return true;
  });
}

function summarizePages(comments: LocalComment[]): CommentExportPageSummary[] {
  const summaries = new Map<string, CommentExportPageSummary>();

  for (const comment of comments) {
    const existing = summaries.get(comment.page.path);
    const summary =
      existing ??
      ({
        path: comment.page.path,
        route: comment.page.route,
        title: comment.page.title,
        url: comment.page.url,
        totalComments: 0,
        openComments: 0,
        resolvedComments: 0,
      } satisfies CommentExportPageSummary);

    summary.totalComments += 1;

    if (comment.status === "resolved") {
      summary.resolvedComments += 1;
    } else {
      summary.openComments += 1;
    }

    summaries.set(comment.page.path, summary);
  }

  return Array.from(summaries.values()).sort((a, b) =>
    a.path.localeCompare(b.path),
  );
}

export function createCommentExport({
  comments,
  projectKey,
  currentPagePath = "",
  options = {},
}: CreateCommentExportInput): CommentExportPayload {
  const resolvedOptions: Required<CommentExportOptions> = {
    scope: options.scope ?? "all",
    status: getStatusFilter(options.status),
    currentPagePath: options.currentPagePath ?? currentPagePath,
  };
  const exportedComments = filterComments(
    comments,
    resolvedOptions.currentPagePath,
    resolvedOptions,
  );
  const openComments = exportedComments.filter(
    (comment) => comment.status === "open",
  ).length;
  const resolvedComments = exportedComments.filter(
    (comment) => comment.status === "resolved",
  ).length;

  return {
    schemaVersion: COMMENT_EXPORT_SCHEMA_VERSION,
    library: {
      name: COMMENT_EXPORT_LIBRARY_NAME,
      version: COMMENT_EXPORT_LIBRARY_VERSION,
    },
    projectKey,
    projectId: projectKey,
    exportedAt: new Date().toISOString(),
    options: resolvedOptions,
    summary: {
      totalComments: exportedComments.length,
      openComments,
      resolvedComments,
      pages: summarizePages(exportedComments),
    },
    comments: exportedComments,
  };
}

export function serializeCommentExport(
  payload: CommentExportPayload,
  space = 2,
): string {
  return JSON.stringify(payload, null, space);
}

export function createCommentExportFilename(
  projectKey: string,
  exportedAt = new Date(),
): string {
  const safeProjectKey = projectKey
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const date = exportedAt.toISOString().slice(0, 10);

  return `pinote-comments-${safeProjectKey || "default"}-${date}.json`;
}

export function downloadCommentExport(
  payload: CommentExportPayload,
  options: DownloadCommentExportOptions = {},
): string | null {
  if (payload.comments.length === 0 || typeof document === "undefined") {
    return null;
  }

  const ownerWindow = document.defaultView ?? window;
  if (
    !ownerWindow.URL ||
    typeof ownerWindow.URL.createObjectURL !== "function" ||
    typeof ownerWindow.URL.revokeObjectURL !== "function"
  ) {
    return null;
  }

  const blob = new Blob([serializeCommentExport(payload, options.space)], {
    type: "application/json",
  });
  const url = ownerWindow.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const filename =
    options.filename ??
    createCommentExportFilename(payload.projectKey, new Date(payload.exportedAt));

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  anchor.setAttribute(PINOTE_UI_ATTRIBUTE, "true");
  anchor.setAttribute(COMMENT_IGNORE_ATTRIBUTE, "true");
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  ownerWindow.URL.revokeObjectURL(url);

  return filename;
}
