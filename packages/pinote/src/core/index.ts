import "../styles/style.css";
import { Pinote, type PinoteOptions } from "./engine";

export { Pinote, type PinoteOptions, type PinoteState } from "./engine";

export function createPinote(options: PinoteOptions = {}): Pinote {
  return new Pinote(options);
}

export { getPageContext, normalizePath } from "./pageContext";
export { captureCommentTarget } from "./captureTarget";
export {
  createLocalComment,
  createLocalId,
  createPendingCommentDraft,
  createReply,
  normalizeCommentText,
} from "./comment";
export {
  createElementSelector,
  getTextHint,
  resolveElementSelector,
} from "./selector";
export { getTargetPosition } from "./position";
export {
  createLocalStorageAdapter,
  type CommentStorageAdapter,
  type LocalStorageAdapterOptions,
} from "./storage/localStorageAdapter";
export {
  COMMENT_EXPORT_LIBRARY_NAME,
  COMMENT_EXPORT_LIBRARY_VERSION,
  COMMENT_EXPORT_SCHEMA_VERSION,
  createCommentExport,
  createCommentExportFilename,
  downloadCommentExport,
  serializeCommentExport,
  type CreateCommentExportInput,
  type DownloadCommentExportOptions,
} from "./export/commentExport";
export {
  importComments,
  mergeImportedComments,
} from "./import/commentImport";
export {
  COMMENT_IGNORE_ATTRIBUTE,
  PINOTE_UI_ATTRIBUTE,
  type CommentExportOptions,
  type CommentExportPageSummary,
  type CommentExportPayload,
  type CommentExportScope,
  type CommentExportStatusFilter,
  type CommentExportSummary,
  type CommentImportResult,
  type CommentReply,
  type CommentStatus,
  type CommentTarget,
  type CommentTargetAttachmentState,
  type CreateCommentInput,
  type ElementMetadata,
  type ElementSelector,
  type LocalComment,
  type PageContext,
  type PendingCommentDraft,
  type SelectorCandidate,
  type SelectorCandidateKind,
  type SelectorStrategy,
  type TargetPosition,
  type TargetRect,
  type HoverOverlayState
} from "./types";
