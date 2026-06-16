import {
  createLocalStorageAdapter,
  type CommentStorageAdapter,
} from "./storage/localStorageAdapter";
import { getPageContext, normalizePath } from "./pageContext";
import { captureCommentTarget } from "./captureTarget";
import { createLocalComment, normalizeCommentText } from "./comment";
import { resolveElementSelector } from "./selector";
import { getTargetPosition } from "./position";
import {
  createCommentExport,
  downloadCommentExport,
} from "./export/commentExport";
import { mergeImportedComments } from "./import/commentImport";
import { COMMENT_IGNORE_ATTRIBUTE, PINOTE_UI_ATTRIBUTE } from "./types";
import type {
  LocalComment,
  CommentTarget,
  PendingCommentDraft,
  PageContext,
  CommentStatus,
  HoverOverlayState,
  TargetPosition,
  CommentExportOptions,
  CommentExportPayload,
  CommentImportResult,
  CommentTargetAttachmentState,
} from "./types";

export type PinoteControlPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface PinoteState {
  isCommentModeEnabled: boolean;
  comments: LocalComment[];
  activeCommentId: string | null;
  pendingCommentDraft: PendingCommentDraft | null;
  hover: HoverOverlayState | null;
  currentPage: PageContext;
  lastCapturedTarget: CommentTarget | null;
  lastImportResult: CommentImportResult | null;
  importError: string | null;
}

export interface PinoteOptions {
  storageKey?: string;
  ignoreSelector?: string;
  controlPosition?: PinoteControlPosition;
  onCommentsChange?: (comments: LocalComment[]) => void;
  onCommentModeChange?: (enabled: boolean) => void;
  onStateChange?: (state: PinoteState) => void;
}

function applyStyles(
  element: HTMLElement | null | undefined,
  ...styles: (Record<string, any> | CSSStyleDeclaration | null | undefined)[]
) {
  if (!element || !element.style) return;

  for (const s of styles) {
    if (!s) continue;
    for (const key in s) {
      // Skip numeric keys (which come from CSSStyleDeclaration objects)
      // and inherited properties/methods
      if (!isNaN(Number(key)) || typeof (s as any)[key] === "function") {
        continue;
      }

      try {
        const value = (s as any)[key];
        if (value === undefined || value === null) {
          continue;
        }

        if (key.startsWith("--")) {
          element.style.setProperty(key, String(value));
        } else {
          (element.style as any)[key] = value;
        }
      } catch {
        // Silently skip properties that cannot be set
      }
    }
  }
}

const PINOTE_UI_SELECTOR = `[${PINOTE_UI_ATTRIBUTE}="true"]`;
const DEFAULT_IGNORE_SELECTOR = `${PINOTE_UI_SELECTOR}, [${COMMENT_IGNORE_ATTRIBUTE}], .pinote-ignore`;
const DEFAULT_CONTROL_POSITION: PinoteControlPosition = "bottom-right";

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  if (typeof FileReader === "undefined") {
    return Promise.reject(
      new Error("FileReader is unavailable in this environment."),
    );
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () =>
      reject(
        reader.error ?? new Error("Pinote could not read the import file."),
      );
    reader.readAsText(file);
  });
}

function markPinoteUi(element: HTMLElement): HTMLElement {
  element.setAttribute(PINOTE_UI_ATTRIBUTE, "true");
  element.setAttribute(COMMENT_IGNORE_ATTRIBUTE, "true");
  return element;
}

export class Pinote {
  private storageKey: string;
  private storageAdapter: CommentStorageAdapter;
  private controlPosition: PinoteControlPosition;
  private isCommentModeEnabled = false;
  private comments: LocalComment[] = [];
  private currentPage: PageContext;
  private pendingCommentDraft: PendingCommentDraft | null = null;
  private activeCommentId: string | null = null;
  private lastCapturedTarget: CommentTarget | null = null;
  private lastImportResult: CommentImportResult | null = null;
  private importError: string | null = null;
  private hover: HoverOverlayState | null = null;
  private effectiveIgnoreSelector: string;

  private onCommentsChange?: (comments: LocalComment[]) => void;
  private onCommentModeChange?: (enabled: boolean) => void;
  private onStateChange?: (state: PinoteState) => void;

  private ignoreNextClick = false;

  private container: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private animationFrameId: number | null = null;
  private cleanupFunctions: Array<() => void> = [];

  constructor(options: PinoteOptions = {}) {
    this.storageKey = options.storageKey || "default";
    this.storageAdapter = createLocalStorageAdapter({
      storageKey: this.storageKey,
    });
    this.controlPosition = options.controlPosition ?? DEFAULT_CONTROL_POSITION;
    this.effectiveIgnoreSelector = options.ignoreSelector
      ? `${DEFAULT_IGNORE_SELECTOR}, ${options.ignoreSelector}`
      : DEFAULT_IGNORE_SELECTOR;

    this.onCommentsChange = options.onCommentsChange;
    this.onCommentModeChange = options.onCommentModeChange;
    this.onStateChange = options.onStateChange;

    this.currentPage = getPageContext();
  }

  public getState(): PinoteState {
    return {
      isCommentModeEnabled: this.isCommentModeEnabled,
      comments: this.comments,
      activeCommentId: this.activeCommentId,
      pendingCommentDraft: this.pendingCommentDraft,
      hover: this.hover,
      currentPage: this.currentPage,
      lastCapturedTarget: this.lastCapturedTarget,
      lastImportResult: this.lastImportResult,
      importError: this.importError,
    };
  }

  private notifyStateChange() {
    this.onStateChange?.(this.getState());
  }

  public mount() {
    if (typeof document === "undefined") return;

    this.comments = this.storageAdapter.load() || [];

    this.container = document.createElement("div");
    this.container.className = "pinote-container pinote-ignore";
    markPinoteUi(this.container);
    document.body.appendChild(this.container);

    this.bindEvents();
    this.render();
    this.notifyStateChange();
  }

  public unmount() {
    this.cleanupFunctions.forEach((fn) => fn());
    this.cleanupFunctions = [];

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.animationFrameId !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }

  public toggleCommentMode = () => {
    this.isCommentModeEnabled = !this.isCommentModeEnabled;
    if (!this.isCommentModeEnabled) {
      this.hover = null;
      this.activeCommentId = null;
      this.pendingCommentDraft = null;
    }
    this.onCommentModeChange?.(this.isCommentModeEnabled);
    this.render();
    this.notifyStateChange();
  };

  public enableCommentMode = () => {
    if (!this.isCommentModeEnabled) {
      this.toggleCommentMode();
    }
  };

  public disableCommentMode = () => {
    if (this.isCommentModeEnabled) {
      this.toggleCommentMode();
    }
  };

  public exportComments = (
    options: CommentExportOptions = {},
  ): CommentExportPayload => {
    return createCommentExport({
      comments: this.comments,
      projectKey: this.storageKey,
      currentPagePath: this.currentPage.path,
      options,
    });
  };

  public downloadCommentsExport = (
    options: CommentExportOptions = {},
  ): string | null => {
    const payload = this.exportComments(options);
    return downloadCommentExport(payload);
  };

  public importComments = (input: unknown): CommentImportResult => {
    const result = mergeImportedComments(this.comments, input);
    this.lastImportResult = result;
    this.importError =
      result.errors.length > 0 ? result.errors.join(" ") : null;

    if (result.errors.length > 0 && typeof console !== "undefined") {
      console.warn("[Pinote] Import warning:", this.importError);
    }

    if (result.added > 0 || result.updated > 0) {
      this.saveComments(result.comments);
    } else {
      this.render();
      this.notifyStateChange();
    }

    return result;
  };

  public mergeImportedComments = (input: unknown): CommentImportResult => {
    return this.importComments(input);
  };

  public importCommentsFromFile = async (
    file: File,
  ): Promise<CommentImportResult> => {
    if (
      !file.name.toLowerCase().endsWith(".json") &&
      file.type !== "application/json"
    ) {
      const result: CommentImportResult = {
        total: 0,
        imported: 0,
        added: 0,
        updated: 0,
        skipped: 0,
        invalid: 0,
        comments: this.comments,
        errors: ["Pinote imports require a .json file."],
      };
      this.lastImportResult = result;
      this.importError = result.errors[0];
      if (typeof console !== "undefined") {
        console.warn("[Pinote] Import warning:", this.importError);
      }
      this.render();
      this.notifyStateChange();
      return result;
    }

    try {
      const text = await readFileAsText(file);
      return this.importComments(text);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Pinote could not read the import file.";
      const result: CommentImportResult = {
        total: 0,
        imported: 0,
        added: 0,
        updated: 0,
        skipped: 0,
        invalid: 0,
        comments: this.comments,
        errors: [message],
      };
      this.lastImportResult = result;
      this.importError = message;
      if (typeof console !== "undefined") {
        console.warn("[Pinote] Import warning:", message);
      }
      this.render();
      this.notifyStateChange();
      return result;
    }
  };

  public deleteComment = (id: string) => {
    this.saveComments(this.comments.filter((c) => c.id !== id));
    if (this.activeCommentId === id) {
      this.activeCommentId = null;
      this.render();
      this.notifyStateChange();
    }
  };

  public resolveComment = (id: string) => {
    this.saveComments(
      this.comments.map((c) =>
        c.id === id
          ? { ...c, status: "resolved", updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  };

  public reopenComment = (id: string) => {
    this.saveComments(
      this.comments.map((c) =>
        c.id === id
          ? { ...c, status: "open", updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  };

  public updateComment = (id: string, text: string) => {
    const normalized = normalizeCommentText(text);
    if (!normalized) return;
    this.saveComments(
      this.comments.map((c) =>
        c.id === id
          ? { ...c, text: normalized, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  };

  public openComment = (id: string) => {
    this.activeCommentId = id;
    this.pendingCommentDraft = null;
    this.render();
    this.notifyStateChange();
  };

  public closeComment = () => {
    this.activeCommentId = null;
    this.render();
    this.notifyStateChange();
  };

  public clearLocalComments = () => {
    this.storageAdapter.clear();
    this.saveComments([]);
    this.activeCommentId = null;
    this.pendingCommentDraft = null;
    this.render();
    this.notifyStateChange();
  };

  public getCommentTargetState = (
    commentId: string,
  ): CommentTargetAttachmentState | null => {
    const comment = this.comments.find((current) => current.id === commentId);
    if (!comment) return null;
    if (typeof document === "undefined") return "fallback";
    return resolveElementSelector(comment.target.selector, document)
      ? "attached"
      : "fallback";
  };

  private bindEvents() {
    if (typeof window === "undefined") return;

    // Route tracking
    const handlePageChange = () => {
      this.currentPage = getPageContext();
      this.pendingCommentDraft = null;
      this.activeCommentId = null;
      this.hover = null;
      this.render();
      this.notifyStateChange();

      window.requestAnimationFrame(() => {
        this.render();
        setTimeout(() => this.render(), 100);
      });
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      const result = originalPushState.apply(this, args);
      handlePageChange();
      return result;
    };

    window.history.replaceState = function (...args) {
      const result = originalReplaceState.apply(this, args);
      handlePageChange();
      return result;
    };

    const onPopState = () => handlePageChange();
    window.addEventListener("popstate", onPopState);
    window.addEventListener("hashchange", onPopState);

    this.cleanupFunctions.push(() => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("hashchange", onPopState);
    });

    // Layout tracking
    const handleLayoutChange = () => {
      if (this.animationFrameId !== null) return;
      this.animationFrameId = window.requestAnimationFrame(() => {
        this.animationFrameId = null;
        this.render();
      });
    };

    window.addEventListener("scroll", handleLayoutChange, true);
    window.addEventListener("resize", handleLayoutChange);

    this.cleanupFunctions.push(() => {
      window.removeEventListener("scroll", handleLayoutChange, true);
      window.removeEventListener("resize", handleLayoutChange);
    });

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => handleLayoutChange());
      this.resizeObserver.observe(document.body);
    }

    // Pointer events
    const onPointerMove = (e: PointerEvent) => {
      if (!this.isCommentModeEnabled || this.pendingCommentDraft) return;
      if (this.isPinoteUiTarget(e.target)) {
        this.hover = null;
        this.render();
        return;
      }

      const target = this.findCommentTarget(e.target as Element);
      if (target) {
        const position = getTargetPosition(target);
        this.hover = {
          label: this.describeElement(target),
          rect: position.rect,
          selectorPreview:
            target.getAttribute("data-comment-anchor") ||
            target.getAttribute("data-rcl-id") ||
            target.getAttribute("data-testid") ||
            target.getAttribute("id") ||
            undefined,
        };
      } else {
        this.hover = null;
      }
      this.render();
    };

    const onPointerLeave = () => {
      if (!this.isCommentModeEnabled) return;
      this.hover = null;
      this.render();
    };

    const onClick = (e: MouseEvent) => {
      if (this.ignoreNextClick) {
        this.ignoreNextClick = false;
        return;
      }

      if (!this.isCommentModeEnabled) return;

      // Do not allow creating new comments if a modal is currently open
      // (This serves as an additional safeguard)
      if (this.activeCommentId || this.pendingCommentDraft) {
        return;
      }

      if (this.isPinoteUiTarget(e.target)) {
        return;
      }

      const target = this.findCommentTarget(e.target as Element);
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const captured = captureCommentTarget(target, {
          clientX: e.clientX,
          clientY: e.clientY,
        });
        this.lastCapturedTarget = captured;
        this.pendingCommentDraft = {
          id: `draft_${Date.now()}`,
          text: "",
          target: captured,
          page: this.currentPage,
          createdAt: new Date().toISOString(),
        };
        this.activeCommentId = null;
        this.hover = null;
        this.render();
        this.notifyStateChange();
      }
    };

    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerleave", onPointerLeave, true);
    document.addEventListener("click", onClick, true);

    this.cleanupFunctions.push(() => {
      document.removeEventListener("pointermove", onPointerMove, true);
      document.removeEventListener("pointerleave", onPointerLeave, true);
      document.removeEventListener("click", onClick, true);
    });
  }

  private findCommentTarget(rawTarget: Element | null): Element | null {
    if (!rawTarget || !(rawTarget instanceof Element)) return null;
    const docElement = rawTarget.ownerDocument.documentElement;
    if (rawTarget === docElement || rawTarget === rawTarget.ownerDocument.body)
      return null;
    if (this.isPinoteUiTarget(rawTarget)) return null;
    if (rawTarget.closest(this.effectiveIgnoreSelector)) return null;
    return rawTarget;
  }

  private isPinoteUiTarget(target: EventTarget | null): boolean {
    if (target instanceof Element) {
      return target.closest(PINOTE_UI_SELECTOR) !== null;
    }

    if (target instanceof Node && target.parentElement) {
      return target.parentElement.closest(PINOTE_UI_SELECTOR) !== null;
    }

    return false;
  }

  private describeElement(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = element.getAttribute("id");
    const ariaLabel = element.getAttribute("aria-label");
    const name = element.getAttribute("name");

    if (ariaLabel) return `${tag}[aria-label="${ariaLabel}"]`;
    if (id) return `${tag}#${id}`;
    if (name) return `${tag}[name="${name}"]`;

    const className = Array.from(element.classList).slice(0, 2).join(".");
    return className ? `${tag}.${className}` : tag;
  }

  private saveComments(newComments: LocalComment[]) {
    this.comments = newComments;
    this.storageAdapter.save(this.comments);
    this.onCommentsChange?.(this.comments);
    this.render();
    this.notifyStateChange();
  }

  public render() {
    if (!this.container || typeof document === "undefined") return;

    // We will build the innerHTML or DOM nodes manually
    this.container.innerHTML = "";

    // Render Toolbar
    this.container.appendChild(this.createToolbarNode());

    // Filter comments by page
    const currentPageComments = this.comments.filter(
      (c) => normalizePath(c.page.path) === this.currentPage.path,
    );

    // Render Overlay (Markers + Popovers + Draft + Hover)
    const overlayRenderNeeded = this.isCommentModeEnabled;

    if (overlayRenderNeeded) {
      const overlay = document.createElement("div");
      overlay.className = "pinote-overlay";
      markPinoteUi(overlay);
      overlay.style.position = "fixed";
      overlay.style.inset = "0";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "2147483646";

      if (this.isCommentModeEnabled && this.hover) {
        const highlight = document.createElement("div");
        highlight.className = "pinote-highlight";
        markPinoteUi(highlight);
        applyStyles(highlight, {
          position: "fixed",
          left: `${this.hover.rect.left}px`,
          top: `${this.hover.rect.top}px`,
          width: `${this.hover.rect.width}px`,
          height: `${this.hover.rect.height}px`,
          border: "2px solid #2563eb",
          background: "rgba(37, 99, 235, 0.08)",
          boxShadow:
            "0 0 0 1px rgba(255, 255, 255, 0.92), 0 8px 24px rgba(37, 99, 235, 0.18)",
          borderRadius: "4px",
          pointerEvents: "none",
        });
        overlay.appendChild(highlight);

        const label = document.createElement("div");
        label.className = "pinote-hover-label";
        markPinoteUi(label);
        const labelTop = Math.max(8, this.hover.rect.top - 30);
        const labelLeft = Math.max(
          8,
          Math.min(this.hover.rect.left, window.innerWidth - 380),
        );
        applyStyles(label, {
          position: "fixed",
          left: `${labelLeft}px`,
          top: `${labelTop}px`,
          maxWidth: "360px",
          padding: "5px 8px",
          borderRadius: "6px",
          color: "white",
          background: "#1d4ed8",
          font: "12px/1.3 system-ui, sans-serif",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          pointerEvents: "none",
        });
        label.textContent =
          this.hover.label +
          (this.hover.selectorPreview
            ? ` | ${this.hover.selectorPreview}`
            : "");
        overlay.appendChild(label);
      }

      // Render Markers
      currentPageComments.forEach((comment, index) => {
        const isAttached =
          typeof document !== "undefined" &&
          resolveElementSelector(comment.target.selector, document) !== null;

        if (!isAttached) return; // Do not render fallback markers

        const position = this.getCurrentTargetPosition(comment.target);
        const marker = document.createElement("button");
        marker.className = `pinote-marker ${comment.status === "resolved" ? "is-resolved" : ""}`;
        marker.type = "button";
        markPinoteUi(marker);
        marker.textContent = String(index + 1);

        let left = position.rect.left;
        let top = position.rect.top;
        if (
          position.relativeX !== undefined &&
          position.relativeY !== undefined
        ) {
          left -= 13;
          top -= 13;
        } else {
          left += position.rect.width - 13;
          top -= 13;
        }

        left = Math.max(8, Math.min(left, window.innerWidth - 34));
        top = Math.max(8, Math.min(top, window.innerHeight - 34));

        applyStyles(marker, {
          position: "fixed",
          left: `${left}px`,
          top: `${top}px`,
          width: "26px",
          height: "26px",
          border: "2px solid #ffffff",
          borderRadius: "50%",
          color: "#ffffff",
          background: comment.status === "resolved" ? "#64748b" : "#f97316",
          boxShadow:
            comment.status === "resolved"
              ? "0 10px 26px rgba(100, 116, 139, 0.3)"
              : "0 10px 26px rgba(249, 115, 22, 0.34)",
          cursor: "pointer",
          font: "700 12px/1 system-ui, sans-serif",
          pointerEvents: "auto",
        });

        marker.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.activeCommentId = comment.id;
          this.pendingCommentDraft = null;
          this.render();
        };

        overlay.appendChild(marker);
      });

      // Render Draft Popover
      if (this.pendingCommentDraft) {
        const position = this.getCurrentTargetPosition(
          this.pendingCommentDraft.target,
        );
        overlay.appendChild(
          this.createPopoverNode(
            {
              title: "New comment",
              position,
              content: this.pendingCommentDraft.text,
              onContentChange: (val: string) => {
                if (this.pendingCommentDraft)
                  this.pendingCommentDraft.text = val;
              },
              onSubmit: () => {
                const draft = this.pendingCommentDraft;
                if (!draft) return;
                const normalized = normalizeCommentText(draft.text);
                if (!normalized) return;
                const newComment = createLocalComment({
                  text: normalized,
                  target: draft.target,
                });
                this.activeCommentId = newComment.id;
                this.pendingCommentDraft = null;
                this.saveComments([newComment, ...this.comments]);
              },
              onCancel: () => {
                this.pendingCommentDraft = null;
                this.render();
              },
            },
            true,
          ),
        );
      } else if (this.activeCommentId) {
        const active = currentPageComments.find(
          (c) => c.id === this.activeCommentId,
        );
        const isAttached =
          active &&
          resolveElementSelector(active.target.selector, document) !== null;
        if (active && isAttached) {
          const position = this.getCurrentTargetPosition(active.target);
          overlay.appendChild(
            this.createCommentViewPopover(active, position),
          );
        }
      }

      this.container.appendChild(overlay);
    }
  }

  // ── Comment view popover ─────────────────────────────────────────────────
  // No header, no title bar, no close button.
  // Layout: text → status row → icon actions (bottom-right).
  // Closing: click-outside (capture-phase pointerdown) or Escape on any icon.
  // ─────────────────────────────────────────────────────────────────────────
  private createCommentViewPopover(
    comment: LocalComment,
    position: TargetPosition,
  ): HTMLElement {
    // SVG helpers (inline, no external dep)
    const svg = (path: string, viewBox = "0 0 20 20") =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

    const iconDelete = svg(
      `<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>`,
      "0 0 24 24",
    );
    const iconResolve = svg(
      `<path stroke="none" d="M0 0h20v20H0z" fill="none"/><circle cx="10" cy="10" r="8" stroke="#10B981" stroke-width="1.75"/><polyline points="6.5 10.5 9 13 13.5 8" stroke="#10B981" stroke-width="1.75"/>`,
    );
    const iconReopen = svg(
      `<path stroke="none" d="M0 0h20v20H0z" fill="none"/><path d="M15.5 10a5.5 5.5 0 1 0-1.1 3.3" stroke="#6B7280" stroke-width="1.75"/><polyline points="15.5 5 15.5 10 20 10" stroke="#6B7280" stroke-width="1.75"/>`,
    );

    // Compute position (same viewport-clamping logic as createPopoverNode)
    let left = position.rect.left;
    let top = position.rect.top;
    if (position.relativeX !== undefined) {
      left -= 13;
      top -= 13;
    } else {
      left += position.rect.width - 13;
      top -= 13;
    }
    left = Math.max(16, Math.min(left + 16, window.innerWidth - 336));
    top = Math.max(16, Math.min(top + 20, window.innerHeight - 200));

    // Panel
    const panel = document.createElement("section");
    panel.className = "pinote-panel";
    markPinoteUi(panel);
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-label", "Comment");

    // Stop clicks inside from propagating to the host page
    panel.addEventListener("click", (e) => { e.stopPropagation(); }, false);
    panel.addEventListener("pointerdown", (e) => { e.stopPropagation(); }, false);

    applyStyles(panel, {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: "calc(100vw - 32px)",
      maxWidth: "320px",
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      boxShadow: "0 8px 32px rgba(15,23,42,0.16), 0 2px 8px rgba(15,23,42,0.08)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#0f172a",
      pointerEvents: "auto",
      overflow: "hidden",
    });

    // ── Body (padding 16px) ───────────────────────────────────────────────
    const body = document.createElement("div");
    markPinoteUi(body);
    applyStyles(body, { padding: "16px 16px 0" });

    // Comment text
    const commentText = document.createElement("p");
    commentText.textContent = comment.text;
    markPinoteUi(commentText);
    applyStyles(commentText, {
      margin: "0",
      fontSize: "14px",
      lineHeight: "1.55",
      color: "#0f172a",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    });
    body.appendChild(commentText);

    // Status row (gap 8px below comment text)
    const statusRow = document.createElement("div");
    markPinoteUi(statusRow);
    applyStyles(statusRow, {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      marginTop: "8px",
    });

    const isResolved = comment.status === "resolved";

    // Status icon (inline svg)
    const statusIconWrap = document.createElement("span");
    markPinoteUi(statusIconWrap);
    applyStyles(statusIconWrap, {
      display: "flex",
      alignItems: "center",
      flexShrink: "0",
    });
    statusIconWrap.innerHTML = isResolved
      ? svg(
          `<path stroke="none" d="M0 0h20v20H0z" fill="none"/><circle cx="10" cy="10" r="8" stroke="#6B7280" stroke-width="1.75"/><polyline points="6.5 10.5 9 13 13.5 8" stroke="#6B7280" stroke-width="1.75"/>`,
        )
      : iconResolve;
    statusRow.appendChild(statusIconWrap);

    // Status label
    const statusLabel = document.createElement("span");
    markPinoteUi(statusLabel);
    statusLabel.textContent = isResolved ? "Resolved" : "Open";
    applyStyles(statusLabel, {
      fontSize: "13px",
      fontWeight: "500",
      color: isResolved ? "#6B7280" : "#10B981",
    });
    statusRow.appendChild(statusLabel);

    body.appendChild(statusRow);
    panel.appendChild(body);

    // ── Footer: action icons, bottom-right (gap 16px from status row) ────
    const footer = document.createElement("div");
    markPinoteUi(footer);
    applyStyles(footer, {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: "12px",
      padding: "16px 16px 16px",
    });

    // Helper to create an icon button
    const makeIconBtn = (
      htmlContent: string,
      label: string,
      color: string,
      onClick: () => void,
    ) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.innerHTML = htmlContent;
      btn.setAttribute("aria-label", label);
      btn.setAttribute("title", label);
      markPinoteUi(btn);
      applyStyles(btn, {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        border: "0",
        borderRadius: "6px",
        background: "transparent",
        color,
        cursor: "pointer",
        padding: "0",
        transition: "background 0.12s",
      });
      btn.addEventListener("mouseover", () => {
        btn.style.background = "#f1f5f9";
      });
      btn.addEventListener("mouseout", () => {
        btn.style.background = "transparent";
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      });
      btn.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
      });
      return btn;
    };

    // Delete icon
    const deleteBtn = makeIconBtn(
      iconDelete,
      "Delete comment",
      "#EF4444",
      () => {
        removeOutside();
        this.activeCommentId = null; // Clear ID before saving/rendering
        this.saveComments(this.comments.filter((c) => c.id !== comment.id));
      },
    );
    footer.appendChild(deleteBtn);

    // Resolve / Reopen icon
    const resolveBtn = makeIconBtn(
      isResolved ? iconReopen : iconResolve,
      isResolved ? "Reopen comment" : "Resolve comment",
      isResolved ? "#6B7280" : "#10B981",
      () => {
        removeOutside();
        this.saveComments(
          this.comments.map((c) =>
            c.id === comment.id
              ? {
                  ...c,
                  status: c.status === "resolved" ? "open" : "resolved",
                  updatedAt: new Date().toISOString(),
                }
              : c,
          ),
        );
      },
    );
    footer.appendChild(resolveBtn);

    panel.appendChild(footer);

    // ── Click-outside closes the popover ─────────────────────────────────
    const handleOutside = (e: PointerEvent) => {
      this.ignoreNextClick = true;
      removeOutside();
      this.activeCommentId = null;
      this.render();
      setTimeout(() => {
        this.ignoreNextClick = false;
      }, 100);
    };

    const removeOutside = () => {
      document.removeEventListener("pointerdown", handleOutside, false);
      const idx = this.cleanupFunctions.indexOf(removeOutside);
      if (idx !== -1) this.cleanupFunctions.splice(idx, 1);
    };

    document.addEventListener("pointerdown", handleOutside, false);
    this.cleanupFunctions.push(removeOutside);

    return panel;
  }

  private escapeHtml(unsafe: string) {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private getCurrentTargetPosition(target: CommentTarget): TargetPosition {
    if (typeof document === "undefined") return target.position;
    const resolved = resolveElementSelector(target.selector, document);
    if (resolved) {
      const pos = getTargetPosition(resolved);
      if (
        target.position.relativeX !== undefined &&
        target.position.relativeY !== undefined
      ) {
        const offsetX = pos.rect.width * target.position.relativeX;
        const offsetY = pos.rect.height * target.position.relativeY;
        return {
          ...pos,
          rect: {
            ...pos.rect,
            left: pos.rect.left + offsetX,
            top: pos.rect.top + offsetY,
          },
          relativeX: target.position.relativeX,
          relativeY: target.position.relativeY,
        };
      }
      return pos;
    }
    // Fallback
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    return {
      ...target.position,
      rect: {
        ...target.position.pageRect,
        x: target.position.pageRect.x - scrollX,
        y: target.position.pageRect.y - scrollY,
        top: target.position.pageRect.top - scrollY,
        right: target.position.pageRect.right - scrollX,
        bottom: target.position.pageRect.bottom - scrollY,
        left: target.position.pageRect.left - scrollX,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scroll: { x: scrollX, y: scrollY },
    };
  }

  private getControlPositionStyles(): Record<string, string> {
    const vertical = this.controlPosition.startsWith("top") ? "top" : "bottom";
    const horizontal = this.controlPosition.endsWith("left") ? "left" : "right";

    return {
      position: "fixed",
      [vertical]: "16px",
      [horizontal]: "16px",
      zIndex: "2147483647",
      pointerEvents: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: horizontal === "left" ? "flex-start" : "flex-end",
      gap: "10px",
      fontFamily:
        "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    };
  }

  private createToolbarNode(): HTMLElement {
    const currentPageComments = this.comments.filter(
      (c) => normalizePath(c.page.path) === this.currentPage.path,
    );
    const control = document.createElement("div");
    control.className = "pinote-control";
    markPinoteUi(control);
    applyStyles(control, this.getControlPositionStyles());
    control.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    control.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    const toggleBtn = document.createElement("button");
    toggleBtn.className = `pinote-control-button ${this.isCommentModeEnabled ? "is-active" : ""}`;
    toggleBtn.type = "button";
    markPinoteUi(toggleBtn);
    toggleBtn.setAttribute("aria-pressed", String(this.isCommentModeEnabled));
    toggleBtn.setAttribute(
      "aria-label",
      this.isCommentModeEnabled
        ? "Disable Pinote comments"
        : "Enable Pinote comments",
    );
    applyStyles(toggleBtn, {
      position: "relative",
      display: "grid",
      placeItems: "center",
      width: "44px",
      height: "44px",
      border: "1px solid rgba(148, 163, 184, 0.28)",
      borderRadius: "14px",
      color: this.isCommentModeEnabled ? "#ffffff" : "#0f172a",
      background: this.isCommentModeEnabled
        ? "#1f6feb"
        : "rgba(255, 255, 255, 0.96)",
      boxShadow: "0 16px 38px rgba(15, 23, 42, 0.22)",
      cursor: "pointer",
      font: "800 15px/1 system-ui, sans-serif",
      backdropFilter: "blur(10px)",
    });

    const mark = document.createElement("span");
    mark.textContent = "P";
    markPinoteUi(mark);
    applyStyles(mark, {
      transform: "translateY(-1px)",
    });
    toggleBtn.appendChild(mark);

    if (currentPageComments.length > 0) {
      const badge = document.createElement("span");
      badge.className = "pinote-control-badge";
      badge.textContent = String(currentPageComments.length);
      markPinoteUi(badge);
      applyStyles(badge, {
        position: "absolute",
        top: "-6px",
        right: "-6px",
        minWidth: "20px",
        height: "20px",
        padding: "0 5px",
        display: "grid",
        placeItems: "center",
        border: "2px solid #ffffff",
        borderRadius: "999px",
        color: "#ffffff",
        background: "#f97316",
        font: "800 11px/1 system-ui, sans-serif",
        boxSizing: "border-box",
      });
      toggleBtn.appendChild(badge);
    }

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleCommentMode();
    };
    control.appendChild(toggleBtn);

    if (!this.isCommentModeEnabled) {
      return control;
    }

    const panel = document.createElement("section");
    panel.className = "pinote-control-panel";
    markPinoteUi(panel);
    applyStyles(panel, {
      width: "280px",
      maxWidth: "calc(100vw - 32px)",
      padding: "12px",
      border: "1px solid rgba(203, 213, 225, 0.86)",
      borderRadius: "14px",
      color: "#172033",
      background: "rgba(255, 255, 255, 0.96)",
      boxShadow: "0 20px 52px rgba(15, 23, 42, 0.22)",
      backdropFilter: "blur(12px)",
      boxSizing: "border-box",
    });

    const status = document.createElement("p");
    status.className = "pinote-status is-active";
    status.textContent = "Comment mode enabled";
    markPinoteUi(status);
    applyStyles(status, {
      margin: "0 0 10px",
      color: "#194a9f",
      font: "800 12px/1.4 system-ui, sans-serif",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
    });
    panel.appendChild(status);

    const counts = document.createElement("div");
    counts.className = "pinote-control-counts";
    markPinoteUi(counts);
    applyStyles(counts, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
      marginBottom: "12px",
    });

    [
      ["This page", currentPageComments.length],
      ["Project", this.comments.length],
    ].forEach(([label, count]) => {
      const item = document.createElement("div");
      markPinoteUi(item);
      applyStyles(item, {
        padding: "9px",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        background: "#f8fafc",
      });

      const value = document.createElement("strong");
      value.textContent = String(count);
      markPinoteUi(value);
      applyStyles(value, {
        display: "block",
        color: "#0f172a",
        font: "800 18px/1 system-ui, sans-serif",
      });

      const caption = document.createElement("span");
      caption.textContent = String(label);
      markPinoteUi(caption);
      applyStyles(caption, {
        display: "block",
        marginTop: "5px",
        color: "#64748b",
        font: "600 11px/1 system-ui, sans-serif",
      });

      item.append(value, caption);
      counts.appendChild(item);
    });
    panel.appendChild(counts);

    const actions = document.createElement("div");
    actions.className = "pinote-control-actions";
    markPinoteUi(actions);
    applyStyles(actions, {
      display: "grid",
      gap: "8px",
    });

    const createPanelButton = (
      label: string,
      variant: "primary" | "secondary",
      onClick: (event: MouseEvent) => void,
      disabled = false,
    ) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = disabled;
      button.className = `pinote-button-${variant}`;
      markPinoteUi(button);
      applyStyles(button, {
        width: "100%",
        minHeight: "36px",
        padding: "0 12px",
        border: "0",
        borderRadius: "9px",
        color: variant === "primary" ? "#ffffff" : "#344054",
        background: variant === "primary" ? "#1f6feb" : "#edf1f6",
        font: "800 13px/1 system-ui, sans-serif",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? "0.55" : "1",
      });
      button.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) {
          onClick(event);
        }
      };
      return button;
    };

    const exportBtn = createPanelButton(
      "Export JSON",
      "secondary",
      () => {
        this.downloadCommentsExport({ scope: "all" });
      },
      this.comments.length === 0,
    );
    actions.appendChild(exportBtn);

    const importInput = document.createElement("input");
    importInput.type = "file";
    importInput.accept = ".json,application/json";
    importInput.tabIndex = -1;
    importInput.setAttribute("aria-hidden", "true");
    markPinoteUi(importInput);
    applyStyles(importInput, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "1px",
      height: "1px",
      margin: "-1px",
      padding: "0",
      border: "0",
      opacity: "0",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      clipPath: "inset(50%)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
    });
    importInput.onchange = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const file = importInput.files?.[0];
      if (!file) return;
      await this.importCommentsFromFile(file);
      importInput.value = "";
    };

    const importBtn = createPanelButton("Import JSON", "secondary", () => {
      importInput.click();
    });
    actions.appendChild(importBtn);
    panel.appendChild(actions);
    panel.appendChild(importInput);

    const importMessage = this.importError
      ? this.importError
      : this.lastImportResult
        ? `Imported ${this.lastImportResult.imported} comment${this.lastImportResult.imported === 1 ? "" : "s"}.`
        : null;

    if (importMessage) {
      const message = document.createElement("p");
      message.className = this.importError
        ? "pinote-import-error"
        : "pinote-import-status";
      message.textContent = importMessage;
      markPinoteUi(message);
      applyStyles(message, {
        margin: "10px 0 0",
        color: this.importError ? "#b42318" : "#475467",
        font: "600 12px/1.5 system-ui, sans-serif",
      });
      panel.appendChild(message);
    }

    control.appendChild(panel);
    return control;
  }

  private createPopoverNode(config: any, isInput: boolean): HTMLElement {
    const panel = document.createElement("section");
    panel.className = "pinote-panel";
    markPinoteUi(panel);
    panel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    panel.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });

    let left = config.position.rect.left;
    let top = config.position.rect.top;
    if (config.position.relativeX !== undefined) {
      left -= 13;
      top -= 13;
    } else {
      left += config.position.rect.width - 13;
      top -= 13;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - 34));
    top = Math.max(8, Math.min(top, window.innerHeight - 34));

    left = Math.max(8, Math.min(left + 16, window.innerWidth - 316));
    top = Math.max(8, Math.min(top + 20, window.innerHeight - 230));

    applyStyles(panel, {
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: "300px",
      border: "1px solid #d7dee8",
      borderRadius: "8px",
      background: "#ffffff",
      boxShadow: "0 18px 46px rgba(15, 23, 42, 0.22)",
      color: "#172033",
      fontFamily: "system-ui, sans-serif",
      pointerEvents: "auto",
    });

    const header = document.createElement("div");
    markPinoteUi(header);
    applyStyles(header, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 12px",
      borderBottom: "1px solid #e4e9f0",
    });
    const title = document.createElement("p");
    title.textContent = config.title;
    markPinoteUi(title);
    applyStyles(title, {
      margin: "0",
      color: "#475467",
      fontSize: "12px",
      fontWeight: "800",
      textTransform: "uppercase",
    });
    header.appendChild(title);

    if (config.onClose) {
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.textContent = "x";
      markPinoteUi(closeBtn);
      applyStyles(closeBtn, {
        width: "28px",
        height: "28px",
        border: "0",
        borderRadius: "6px",
        color: "#475467",
        background: "#edf1f6",
        cursor: "pointer",
      });
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        config.onClose();
      };
      header.appendChild(closeBtn);
    }
    panel.appendChild(header);

    const body = document.createElement("div");
    markPinoteUi(body);
    applyStyles(body, { padding: "12px" });

    if (isInput) {
      // ── Keyboard-first composer ──────────────────────────────────────────
      // Enter / Ctrl+Enter / Cmd+Enter  → submit
      // Shift+Enter                     → newline (browser default)
      // Escape                          → cancel (clear draft)
      // Click outside popover           → cancel (clear draft)
      // ────────────────────────────────────────────────────────────────────
      let isSubmitting = false;

      // Declare textarea first so submitDraft can reference it in the closure
      const textarea = document.createElement("textarea");
      textarea.value = config.content || "";
      textarea.placeholder = "Leave a comment...";
      markPinoteUi(textarea);
      applyStyles(textarea, {
        display: "block",
        width: "100%",
        minHeight: "92px",
        resize: "vertical",
        border: "1px solid #cbd5e1",
        borderRadius: "6px",
        padding: "10px",
        color: "#172033",
        background: "#ffffff",
        boxSizing: "border-box",
        fontFamily: "inherit",
        fontSize: "14px",
      });

      // Click-outside handler — declared before submitDraft/cancelDraft so
      // the removeOutsideClickListener reference is valid in their closures.
      const handleOutsidePointerDown = (e: PointerEvent) => {
        this.ignoreNextClick = true;
        cancelDraft();
        setTimeout(() => {
          this.ignoreNextClick = false;
        }, 100);
      };

      const removeOutsideClickListener = () => {
        document.removeEventListener(
          "pointerdown",
          handleOutsidePointerDown,
          false,
        );
        const idx = this.cleanupFunctions.indexOf(removeOutsideClickListener);
        if (idx !== -1) this.cleanupFunctions.splice(idx, 1);
      };

      const submitDraft = () => {
        if (isSubmitting) return;
        // Read the live textarea value, not the snapshot in config.content
        const text = textarea.value;
        const normalized = normalizeCommentText(text);
        if (!normalized) {
          // Visual feedback: flash the textarea border red for 400 ms
          applyStyles(textarea, { borderColor: "#dc2626", transition: "border-color 0s" });
          setTimeout(() => {
            applyStyles(textarea, { borderColor: "#cbd5e1", transition: "border-color 0.3s" });
          }, 400);
          return;
        }
        isSubmitting = true;
        removeOutsideClickListener();
        // Sync the live value back to the draft before calling onSubmit
        config.onContentChange?.(text);
        config.onSubmit?.();
      };

      const cancelDraft = () => {
        removeOutsideClickListener();
        config.onCancel?.();
      };

      textarea.addEventListener(
        "input",
        (e) => {
          config.onContentChange?.((e.target as HTMLTextAreaElement).value);
          // Update in-memory draft text without re-rendering —
          // re-rendering destroys and recreates the textarea, losing cursor position.
        },
        false,
      );

      textarea.addEventListener(
        "keydown",
        (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cancelDraft();
            return;
          }

          // Enter without Shift → submit (plain Enter, Ctrl+Enter, Cmd+Enter)
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            submitDraft();
            return;
          }

          // Shift+Enter → browser inserts newline naturally (no action needed)
        },
        false,
      );

      document.addEventListener("pointerdown", handleOutsidePointerDown, false);
      this.cleanupFunctions.push(removeOutsideClickListener);

      // Auto-focus after the element is in the DOM
      requestAnimationFrame(() => textarea.focus());

      body.appendChild(textarea);

      // Hint text below textarea
      const hint = document.createElement("p");
      hint.textContent = "Enter to submit · Shift+Enter for new line · Esc to cancel";
      markPinoteUi(hint);
      applyStyles(hint, {
        margin: "6px 0 0",
        color: "#94a3b8",
        fontSize: "11px",
        lineHeight: "1.4",
        userSelect: "none",
      });
      body.appendChild(hint);
    } else {
      body.innerHTML = config.bodyHtml;
    }

    panel.appendChild(body);

    // Action buttons — only rendered for comment view popovers (isInput === false)
    if (!isInput && config.actions && config.actions.length > 0) {
      const actionsDiv = document.createElement("div");
      markPinoteUi(actionsDiv);
      applyStyles(actionsDiv, {
        display: "flex",
        justifyContent: "flex-end",
        gap: "8px",
        padding: "0 12px 12px",
      });

      config.actions.forEach((act: any) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = act.label;
        btn.disabled = act.disabled || false;
        markPinoteUi(btn);
        applyStyles(btn, {
          minHeight: "34px",
          padding: "0 12px",
          border: "0",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "700",
          color:
            act.class === "pinote-button-save"
              ? "#ffffff"
              : act.class === "pinote-button-danger"
                ? "#fff"
                : "#344054",
          background:
            act.class === "pinote-button-save"
              ? "#1f6feb"
              : act.class === "pinote-button-danger"
                ? "#dc2626"
                : "#edf1f6",
        });
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          act.onClick();
        };
        btn.addEventListener("pointerdown", (e) => {
          e.stopPropagation();
        });
        actionsDiv.appendChild(btn);
      });

      panel.appendChild(actionsDiv);
    }

    return panel;
  }
}
