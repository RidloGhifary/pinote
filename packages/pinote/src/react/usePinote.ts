"use client";

import { useContext, useMemo } from "react";
import { PinoteContext } from "./PinoteProvider";
import { normalizePath } from "../core/pageContext";

export function usePinote() {
  const context = useContext(PinoteContext);

  if (!context) {
    throw new Error("usePinote must be used within a PinoteProvider.");
  }

  const currentPageComments = useMemo(() => {
    if (!context.comments || !context.currentPage) return [];
    return context.comments.filter(
      (c) => normalizePath(c.page.path) === context.currentPage?.path
    );
  }, [context.comments, context.currentPage]);

  const activeComment = useMemo(() => {
    if (!context.comments || !context.activeCommentId) return null;
    return context.comments.find(c => c.id === context.activeCommentId) || null;
  }, [context.comments, context.activeCommentId]);

  return {
    isCommentModeEnabled: context.isCommentModeEnabled ?? false,
    comments: context.comments || [],
    currentPageComments,
    activeComment,
    activeCommentId: context.activeCommentId || null,
    pendingCommentDraft: context.pendingCommentDraft || null,
    currentPage: context.currentPage || null,
    lastCapturedTarget: context.lastCapturedTarget || null,
    lastImportResult: context.lastImportResult || null,
    importError: context.importError || null,
    enableCommentMode: context.enableCommentMode,
    disableCommentMode: context.disableCommentMode,
    toggleCommentMode: context.toggleCommentMode,
    exportComments: context.exportComments,
    downloadCommentsExport: context.downloadCommentsExport,
    importComments: context.importComments,
    mergeImportedComments: context.mergeImportedComments,
    importCommentsFromFile: context.importCommentsFromFile,
    deleteComment: context.deleteComment,
    resolveComment: context.resolveComment,
    reopenComment: context.reopenComment,
    updateComment: context.updateComment,
    openComment: context.openComment,
    closeComment: context.closeComment,
    clearLocalComments: context.clearLocalComments,
    getCommentTargetState: context.getCommentTargetState,
  };
}
