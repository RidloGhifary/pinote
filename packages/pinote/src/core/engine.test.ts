import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureCommentTarget } from "./captureTarget";
import { createLocalComment } from "./comment";
import { Pinote } from "./engine";
import { PINOTE_UI_ATTRIBUTE } from "./types";
import type { LocalComment } from "./types";
import validPinoteExportJson from "./import/__fixtures__/valid-pinote-export.json?raw";
import invalidJson from "./import/__fixtures__/invalid-json.json?raw";

let pinote: Pinote | null = null;

function createJsonFile(contents: string, name = "pinote-comments.json"): File {
  return new File([contents], name, { type: "application/json" });
}

function createAttachedComment(path = window.location.pathname): LocalComment {
  const target = captureCommentTarget(
    document.querySelector("[data-testid='target']")!,
  );
  return {
    ...createLocalComment({ text: `Comment for ${path}`, target }),
    page: {
      ...target.page,
      path,
      route: path,
    },
    target: {
      ...target,
      page: {
        ...target.page,
        path,
        route: path,
      },
    },
  };
}

function clickElement(element: Element) {
  element.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: 12,
      clientY: 12,
    }),
  );
}

async function flushFileImport() {
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("Pinote floating control", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, "", "/");
    document.body.innerHTML = `
      <main>
        <button data-testid="target">Target</button>
      </main>
    `;
  });

  afterEach(() => {
    pinote?.unmount();
    pinote = null;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    window.localStorage.clear();
  });

  it("keeps the floating button visible while disabled", () => {
    pinote = new Pinote({ storageKey: "floating-disabled" });
    pinote.mount();

    const button = document.querySelector<HTMLButtonElement>(
      ".pinote-control-button",
    );
    const panel = document.querySelector(".pinote-control-panel");

    expect(button).not.toBeNull();
    expect(button?.style.position).toBe("relative");
    expect(document.querySelector(".pinote-marker")).toBeNull();
    expect(panel).toBeNull();
  });

  it("hides pins while disabled and shows them again when enabled", () => {
    const comment = createAttachedComment("/");
    pinote = new Pinote({ storageKey: "floating-toggle" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });

    expect(document.querySelector(".pinote-control-button")).not.toBeNull();
    expect(document.querySelector(".pinote-marker")).toBeNull();

    document
      .querySelector<HTMLButtonElement>(".pinote-control-button")
      ?.click();

    expect(document.querySelector(".pinote-control-panel")).not.toBeNull();
    expect(document.querySelector(".pinote-marker")).not.toBeNull();

    document
      .querySelector<HTMLButtonElement>(".pinote-control-button")
      ?.click();

    expect(document.querySelector(".pinote-control-panel")).toBeNull();
    expect(document.querySelector(".pinote-marker")).toBeNull();
  });

  it("does not render imported comments on the wrong page", () => {
    const comment = createAttachedComment("/review");
    pinote = new Pinote({ storageKey: "floating-route-filter" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });

    document
      .querySelector<HTMLButtonElement>(".pinote-control-button")
      ?.click();

    expect(document.querySelector(".pinote-control-panel")).not.toBeNull();
    expect(document.querySelector(".pinote-marker")).toBeNull();
  });

  it("renders the control above host UI", () => {
    pinote = new Pinote({ storageKey: "floating-z-index" });
    pinote.mount();

    const control = document.querySelector<HTMLElement>(".pinote-control");

    expect(control?.style.position).toBe("fixed");
    expect(control?.style.zIndex).toBe("2147483647");
    expect(control?.style.pointerEvents).toBe("auto");
  });

  it("marks Pinote-owned UI with the internal UI attribute", () => {
    const comment = createAttachedComment("/");
    pinote = new Pinote({ storageKey: "pinote-ui-attribute" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });
    pinote.enableCommentMode();
    pinote.openComment(comment.id);

    const control = document.querySelector<HTMLElement>(".pinote-control");
    const button = document.querySelector<HTMLElement>(
      ".pinote-control-button",
    );
    const panel = document.querySelector<HTMLElement>(".pinote-control-panel");
    const overlay = document.querySelector<HTMLElement>(".pinote-overlay");
    const marker = document.querySelector<HTMLElement>(".pinote-marker");
    const popover = document.querySelector<HTMLElement>(".pinote-panel");
    const exportButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Export JSON",
    );
    const importButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Import JSON",
    );
    const importInput = document.querySelector<HTMLInputElement>(
      ".pinote-control-panel input[type='file']",
    );

    expect(control?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(button?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(panel?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(overlay?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(marker?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(popover?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(exportButton?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(importButton?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(importInput?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
  });

  it("does not render a duplicate hide button in the control panel", () => {
    pinote = new Pinote({ storageKey: "pinote-no-hide-button" });
    pinote.mount();
    pinote.enableCommentMode();

    const panelText =
      document.querySelector(".pinote-control-panel")?.textContent ?? "";
    const buttonText = Array.from(document.querySelectorAll("button")).map(
      (button) => button.textContent,
    );

    expect(panelText).not.toMatch(/Hide\s+Pinotee*/);
    expect(buttonText.join(" ")).not.toMatch(/Hide\s+Pinotee*/);
  });

  it("clicking the floating button toggles only and does not create a comment draft", () => {
    pinote = new Pinote({ storageKey: "pinote-toggle-click" });
    pinote.mount();

    clickElement(document.querySelector(".pinote-control-button")!);

    expect(pinote.getState().isCommentModeEnabled).toBe(true);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("clicking the control panel does not create a comment draft", () => {
    pinote = new Pinote({ storageKey: "pinote-panel-click" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector(".pinote-control-panel")!);

    expect(pinote.getState().isCommentModeEnabled).toBe(true);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("clicking Export does not create a comment draft", () => {
    const comment = createAttachedComment("/");
    pinote = new Pinote({ storageKey: "pinote-export-click" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });
    pinote.enableCommentMode();
    const exportSpy = vi.spyOn(pinote, "downloadCommentsExport");

    const exportButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Export JSON",
    );
    expect(exportButton).not.toBeUndefined();
    clickElement(exportButton!);

    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("the real Export download click does not create a comment draft", () => {
    const createObjectURLDescriptor = Object.getOwnPropertyDescriptor(
      window.URL,
      "createObjectURL",
    );
    const revokeObjectURLDescriptor = Object.getOwnPropertyDescriptor(
      window.URL,
      "revokeObjectURL",
    );
    const createObjectURL = vi.fn(() => "blob:pinote-export");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, "createObjectURL", {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(window.URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURL,
    });

    const comment = createAttachedComment("/");
    pinote = new Pinote({ storageKey: "pinote-export-real-click" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });
    pinote.enableCommentMode();

    const exportButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Export JSON",
    );
    expect(exportButton).not.toBeUndefined();
    clickElement(exportButton!);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
    expect(document.querySelector("textarea")).toBeNull();
    expect(pinote.getState().comments).toHaveLength(1);

    if (createObjectURLDescriptor) {
      Object.defineProperty(
        window.URL,
        "createObjectURL",
        createObjectURLDescriptor,
      );
    } else {
      Reflect.deleteProperty(window.URL, "createObjectURL");
    }

    if (revokeObjectURLDescriptor) {
      Object.defineProperty(
        window.URL,
        "revokeObjectURL",
        revokeObjectURLDescriptor,
      );
    } else {
      Reflect.deleteProperty(window.URL, "revokeObjectURL");
    }
  });

  it("clicking Import opens the hidden file input without creating a draft", () => {
    pinote = new Pinote({ storageKey: "pinote-import-click" });
    pinote.mount();
    pinote.enableCommentMode();
    const inputClickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    const importButton = Array.from(document.querySelectorAll("button")).find(
      (button) => button.textContent === "Import JSON",
    );
    expect(importButton).not.toBeUndefined();
    clickElement(importButton!);

    expect(inputClickSpy).toHaveBeenCalledTimes(1);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("renders the Import file input with JSON-only visually hidden attributes", () => {
    pinote = new Pinote({ storageKey: "pinote-import-input" });
    pinote.mount();
    pinote.enableCommentMode();

    const importInput = document.querySelector<HTMLInputElement>(
      ".pinote-control-panel input[type='file']",
    );

    expect(importInput).not.toBeNull();
    expect(importInput?.accept).toBe(".json,application/json");
    expect(importInput?.getAttribute(PINOTE_UI_ATTRIBUTE)).toBe("true");
    expect(importInput?.style.display).not.toBe("none");
    expect(importInput?.style.position).toBe("fixed");
    expect(importInput?.style.opacity).toBe("0");
  });

  it("pressing Enter submits a comment and closes the composer", () => {
    pinote = new Pinote({ storageKey: "pinote-enter-submits" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    textarea!.value = "Keyboard comment";
    textarea!.dispatchEvent(new Event("input", { bubbles: true }));

    textarea!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(pinote.getState().pendingCommentDraft).toBeNull();
    expect(pinote.getState().comments).toHaveLength(1);
    expect(pinote.getState().comments[0]?.text).toBe("Keyboard comment");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("pressing Shift+Enter inserts a newline and does NOT submit", () => {
    pinote = new Pinote({ storageKey: "pinote-shift-enter-newline" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    textarea!.value = "line one";
    textarea!.dispatchEvent(new Event("input", { bubbles: true }));

    // Shift+Enter should NOT submit — browser handles the newline natively
    textarea!.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    // Draft still open, no comment created
    expect(pinote.getState().pendingCommentDraft).not.toBeNull();
    expect(pinote.getState().comments).toHaveLength(0);
    expect(document.querySelector("textarea")).not.toBeNull();
  });

  it("pressing Escape cancels the draft and removes the composer", () => {
    pinote = new Pinote({ storageKey: "pinote-escape-cancel" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    expect(document.querySelector("textarea")).not.toBeNull();
    expect(pinote.getState().pendingCommentDraft).not.toBeNull();

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );

    expect(pinote.getState().pendingCommentDraft).toBeNull();
    expect(pinote.getState().comments).toHaveLength(0);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("clicking outside the composer cancels the draft", () => {
    pinote = new Pinote({ storageKey: "pinote-outside-click-cancel" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    expect(document.querySelector("textarea")).not.toBeNull();
    expect(pinote.getState().pendingCommentDraft).not.toBeNull();

    // Dispatch a pointerdown outside the popover (on the body, not inside the panel)
    const outsideTarget = document.querySelector("main")!;
    outsideTarget.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, cancelable: true }),
    );

    expect(pinote.getState().pendingCommentDraft).toBeNull();
    expect(pinote.getState().comments).toHaveLength(0);
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("pressing Enter with empty textarea does not create a comment", () => {
    pinote = new Pinote({ storageKey: "pinote-empty-enter-no-submit" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea");
    expect(textarea).not.toBeNull();
    // textarea is empty (default)

    textarea!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    // Draft still open, no comment created
    expect(pinote.getState().pendingCommentDraft).not.toBeNull();
    expect(pinote.getState().comments).toHaveLength(0);
    expect(document.querySelector("textarea")).not.toBeNull();
  });

  it("pressing Enter twice quickly only creates one comment (double-submit guard)", () => {
    pinote = new Pinote({ storageKey: "pinote-double-submit-guard" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Double submit test";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    // First Enter — should submit
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );
    // Second Enter immediately after (textarea is gone but we already dispatched)
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(pinote.getState().comments).toHaveLength(1);
  });

  it("comment persists in localStorage after keyboard submission", () => {
    pinote = new Pinote({ storageKey: "pinote-persistence" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Persisted comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    expect(pinote.getState().comments).toHaveLength(1);

    const raw = window.localStorage.getItem(
      "react-comment-library:pinote-persistence:v1",
    );
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!) as { comments?: { text: string }[] };
    expect(stored.comments).toHaveLength(1);
    expect(stored.comments![0]?.text).toBe("Persisted comment");
  });

  it("pressing Ctrl+Enter submits a comment", () => {
    pinote = new Pinote({ storageKey: "pinote-ctrl-enter" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Ctrl+Enter comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(pinote.getState().comments).toHaveLength(1);
    expect(pinote.getState().comments[0]?.text).toBe("Ctrl+Enter comment");
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("pressing Cmd+Enter (metaKey) submits a comment", () => {
    pinote = new Pinote({ storageKey: "pinote-cmd-enter" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "Cmd+Enter comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(pinote.getState().comments).toHaveLength(1);
    expect(pinote.getState().comments[0]?.text).toBe("Cmd+Enter comment");
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("composer has no Submit or Cancel buttons", () => {
    pinote = new Pinote({ storageKey: "pinote-no-buttons" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    expect(document.querySelector("textarea")).not.toBeNull();

    const allButtonLabels = Array.from(document.querySelectorAll("button")).map(
      (btn) => btn.textContent?.trim(),
    );

    expect(allButtonLabels).not.toContain("Save");
    expect(allButtonLabels).not.toContain("Cancel");
    expect(allButtonLabels).not.toContain("Submit");
    expect(allButtonLabels).not.toContain("Delete");
  });

  it("React PinoteProvider state reflects comment created via keyboard Enter", () => {
    // This test verifies the engine-level state change that PinoteProvider
    // surfaces via its onStateChange callback — the same flow React consumers use.
    const stateChanges: import("./engine").PinoteState[] = [];
    pinote = new Pinote({
      storageKey: "pinote-react-state",
      onStateChange: (s) => stateChanges.push(s),
    });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector('[data-testid="target"]')!);

    const textarea = document.querySelector<HTMLTextAreaElement>("textarea")!;
    textarea.value = "React state comment";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    );

    const lastState = stateChanges[stateChanges.length - 1]!;
    expect(lastState.comments).toHaveLength(1);
    expect(lastState.comments[0]?.text).toBe("React state comment");
    expect(lastState.pendingCommentDraft).toBeNull();
  });

  it("imports a valid Pinote JSON file and skips duplicate imports", async () => {
    const file = createJsonFile(validPinoteExportJson);
    pinote = new Pinote({ storageKey: "pinote-file-import" });
    pinote.mount();

    const first = await pinote.importCommentsFromFile(file);
    const second = await pinote.importCommentsFromFile(file);

    expect(first.added).toBe(1);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(pinote.getState().comments).toHaveLength(1);
  });

  it("imports through the hidden file input change event and refreshes storage, UI, and export", async () => {
    const file = createJsonFile(validPinoteExportJson);
    pinote = new Pinote({ storageKey: "pinote-file-input-import" });
    pinote.mount();
    pinote.enableCommentMode();

    const importInput = document.querySelector<HTMLInputElement>(
      ".pinote-control-panel input[type='file']",
    );
    expect(importInput).not.toBeNull();
    Object.defineProperty(importInput!, "files", {
      configurable: true,
      value: [file],
    });

    importInput!.dispatchEvent(
      new Event("change", { bubbles: true, cancelable: true }),
    );
    await flushFileImport();

    const state = pinote.getState();
    const stored = JSON.parse(
      window.localStorage.getItem(
        "react-comment-library:pinote-file-input-import:v1",
      ) ?? "{}",
    ) as { comments?: LocalComment[] };
    const exported = pinote.exportComments({ scope: "all" });

    expect(state.comments).toHaveLength(1);
    expect(state.pendingCommentDraft).toBeNull();
    expect(stored.comments).toHaveLength(1);
    expect(document.querySelector(".pinote-marker")).not.toBeNull();
    expect(exported.comments[0]?.id).toBe("comment_fixture_valid");
    expect(importInput?.value).toBe("");
  });

  it("does not crash when importing an invalid JSON file", async () => {
    const existing = createAttachedComment("/");
    const file = createJsonFile(invalidJson);
    pinote = new Pinote({ storageKey: "pinote-file-import-invalid" });
    pinote.mount();
    pinote.importComments({ comments: [existing] });

    const result = await pinote.importCommentsFromFile(file);

    expect(result.imported).toBe(0);
    expect(result.errors[0]).toContain("Invalid JSON");
    expect(pinote.getState().comments).toHaveLength(1);
  });

  it("clicking a comment pin opens only that comment", () => {
    const comment = createAttachedComment("/");
    pinote = new Pinote({ storageKey: "pinote-pin-click" });
    pinote.mount();
    pinote.importComments({ comments: [comment] });
    pinote.enableCommentMode();

    clickElement(document.querySelector(".pinote-marker")!);

    expect(pinote.getState().activeCommentId).toBe(comment.id);
    expect(pinote.getState().pendingCommentDraft).toBeNull();
  });

  it("clicking page content creates a comment draft when enabled", () => {
    pinote = new Pinote({ storageKey: "pinote-host-click" });
    pinote.mount();
    pinote.enableCommentMode();

    clickElement(document.querySelector("[data-testid='target']")!);

    expect(pinote.getState().pendingCommentDraft).not.toBeNull();
    expect(pinote.getState().lastCapturedTarget?.element.tagName).toBe(
      "button",
    );
  });
});
