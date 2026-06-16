export const COMMENT_IGNORE_ATTRIBUTE = "data-rcl-ignore";
export const PINOTE_UI_ATTRIBUTE = "data-pinote-ui";

export type SelectorStrategy =
  | "data-attribute"
  | "id"
  | "aria-label"
  | "name"
  | "role"
  | "class"
  | "hierarchy"
  | "dom-path";

export type SelectorCandidateKind = SelectorStrategy | "text-hint";

export interface SelectorCandidate {
  kind: SelectorCandidateKind;
  selector: string;
  score: number;
  unique: boolean;
  matchCount: number;
  attribute?: string;
  value?: string;
  reason: string;
}

export interface ElementSelector {
  primary: string;
  strategy: SelectorStrategy;
  candidates: SelectorCandidate[];
  fallback: string;
  textHint?: string;
}

export interface PageContext {
  path: string;
  route: string;
  url: string;
  origin: string;
  title: string;
  capturedAt: string;
}

export interface TargetRect {
  x: number;
  y: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

export interface TargetPosition {
  rect: TargetRect;
  pageRect: TargetRect;
  viewport: {
    width: number;
    height: number;
  };
  scroll: {
    x: number;
    y: number;
  };
  relativeX?: number;
  relativeY?: number;
}

export interface ElementMetadata {
  tagName: string;
  id?: string;
  role?: string;
  ariaLabel?: string;
  name?: string;
  textSnippet?: string;
  classNames: string[];
  attributes: Record<string, string>;
}

export interface CommentTarget {
  version: 1;
  id: string;
  capturedAt: string;
  page: PageContext;
  selector: ElementSelector;
  position: TargetPosition;
  element: ElementMetadata;
}

export type CommentStatus = "open" | "resolved";

export interface CommentReply {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalComment {
  version: 1;
  id: string;
  text: string;
  target: CommentTarget;
  page: PageContext;
  createdAt: string;
  updatedAt: string;
  status: CommentStatus;
  replies: CommentReply[];
}

export interface PendingCommentDraft {
  id: string;
  text: string;
  target: CommentTarget;
  page: PageContext;
  createdAt: string;
}

export interface CreateCommentInput {
  text: string;
  target: CommentTarget;
  status?: CommentStatus;
  replies?: CommentReply[];
}

export interface HoverOverlayState {
  label: string;
  rect: TargetRect;
  selectorPreview?: string;
}

export type CommentTargetAttachmentState = "attached" | "fallback";

export type CommentExportScope = "all" | "current-page";

export type CommentExportStatusFilter = "all" | CommentStatus;

export interface CommentExportPageSummary {
  path: string;
  route: string;
  title: string;
  url: string;
  totalComments: number;
  openComments: number;
  resolvedComments: number;
}

export interface CommentExportSummary {
  totalComments: number;
  openComments: number;
  resolvedComments: number;
  pages: CommentExportPageSummary[];
}

export interface CommentExportOptions {
  scope?: CommentExportScope;
  status?: CommentExportStatusFilter;
  currentPagePath?: string;
}

export interface CommentExportPayload {
  schemaVersion: 1;
  library: {
    name: string;
    version: string;
  };
  projectKey: string;
  projectId: string;
  exportedAt: string;
  options: Required<CommentExportOptions>;
  summary: CommentExportSummary;
  comments: LocalComment[];
}

export interface CommentImportResult {
  total: number;
  imported: number;
  added: number;
  updated: number;
  skipped: number;
  invalid: number;
  comments: LocalComment[];
  errors: string[];
}
