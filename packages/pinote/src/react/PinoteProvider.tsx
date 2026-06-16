"use client";

import { useEffect, useRef, useState, createContext, type ReactNode } from "react";
import { Pinote, type PinoteOptions, type PinoteState } from "../core/engine";
import { 
  type CommentExportOptions,
  type CommentExportPayload,
  type CommentImportResult,
  type CommentTargetAttachmentState,
  type LocalComment,
  type CommentTarget,
  type PendingCommentDraft,
  type PageContext
} from "../core/types";

export interface PinoteProviderProps extends PinoteOptions {
  children: ReactNode;
}

interface PinoteContextValue extends Partial<PinoteState> {
  pinote: Pinote | null;
  enableCommentMode: () => void;
  disableCommentMode: () => void;
  toggleCommentMode: () => void;
  exportComments: (options?: CommentExportOptions) => CommentExportPayload | undefined;
  downloadCommentsExport: (options?: CommentExportOptions) => string | null | undefined;
  importComments: (input: unknown) => CommentImportResult | undefined;
  mergeImportedComments: (input: unknown) => CommentImportResult | undefined;
  importCommentsFromFile: (file: File) => Promise<CommentImportResult | undefined>;
  deleteComment: (id: string) => void;
  resolveComment: (id: string) => void;
  reopenComment: (id: string) => void;
  updateComment: (id: string, text: string) => void;
  openComment: (id: string) => void;
  closeComment: () => void;
  clearLocalComments: () => void;
  getCommentTargetState: (id: string) => CommentTargetAttachmentState | null | undefined;
}

export const PinoteContext = createContext<PinoteContextValue | null>(null);

export function PinoteProvider({
  children,
  ...options
}: PinoteProviderProps) {
  const pinoteRef = useRef<Pinote | null>(null);
  const [state, setState] = useState<PinoteState | null>(null);

  useEffect(() => {
    const pinote = new Pinote({
      ...options,
      onStateChange: (newState) => {
        setState(newState);
      },
    });

    pinote.mount();
    pinoteRef.current = pinote;
    setState(pinote.getState());

    return () => {
      pinote.unmount();
      pinoteRef.current = null;
    };
  }, []);

  const value: PinoteContextValue = {
    pinote: pinoteRef.current,
    ...state,
    enableCommentMode: () => pinoteRef.current?.enableCommentMode(),
    disableCommentMode: () => pinoteRef.current?.disableCommentMode(),
    toggleCommentMode: () => pinoteRef.current?.toggleCommentMode(),
    exportComments: (options) => pinoteRef.current?.exportComments(options),
    downloadCommentsExport: (options) => pinoteRef.current?.downloadCommentsExport(options),
    importComments: (input) => pinoteRef.current?.importComments(input),
    mergeImportedComments: (input) => pinoteRef.current?.mergeImportedComments(input),
    importCommentsFromFile: (file) => {
      const result = pinoteRef.current?.importCommentsFromFile(file);
      return result ?? Promise.resolve(undefined);
    },
    deleteComment: (id) => pinoteRef.current?.deleteComment(id),
    resolveComment: (id) => pinoteRef.current?.resolveComment(id),
    reopenComment: (id) => pinoteRef.current?.reopenComment(id),
    updateComment: (id, text) => pinoteRef.current?.updateComment(id, text),
    openComment: (id) => pinoteRef.current?.openComment(id),
    closeComment: () => pinoteRef.current?.closeComment(),
    clearLocalComments: () => pinoteRef.current?.clearLocalComments(),
    getCommentTargetState: (id) => pinoteRef.current?.getCommentTargetState(id),
  };

  return (
    <PinoteContext.Provider value={value}>
      {children}
    </PinoteContext.Provider>
  );
}

// Stubs for backwards compatibility or manual placement if desired
export function PinoteLayer() {
  return null;
}

export function PinoteToolbar() {
  return null;
}
