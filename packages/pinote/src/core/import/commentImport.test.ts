import { describe, expect, it } from "vitest";
import { captureCommentTarget } from "../captureTarget";
import { createLocalComment } from "../comment";
import { mergeImportedComments } from "./commentImport";
import type { LocalComment } from "../types";
import validPinoteExportJson from "./__fixtures__/valid-pinote-export.json?raw";
import invalidJson from "./__fixtures__/invalid-json.json?raw";
import duplicateCommentsJson from "./__fixtures__/duplicate-comments.json?raw";

interface ImportedFixtureComment extends LocalComment {
  projectId?: string;
  pathname?: string;
  url?: string;
  message?: string;
}

function createComment(text = "Review this button"): LocalComment {
  document.body.innerHTML = `<button data-testid="save-button">Save</button>`;
  const target = captureCommentTarget(document.querySelector("button")!);
  return createLocalComment({ text, target });
}

describe("mergeImportedComments", () => {
  it("imports comments from the current exported JSON shape", () => {
    const comment = createComment();
    const result = mergeImportedComments([], {
      schemaVersion: 1,
      projectId: "demo",
      exportedAt: new Date().toISOString(),
      comments: [comment],
    });

    expect(result.errors).toEqual([]);
    expect(result.added).toBe(1);
    expect(result.imported).toBe(1);
    expect(result.comments[0]?.id).toBe(comment.id);
  });

  it("imports fixture export data and preserves comment metadata", () => {
    const result = mergeImportedComments([], validPinoteExportJson);
    const imported = result.comments[0] as ImportedFixtureComment | undefined;

    expect(result.errors).toEqual([]);
    expect(result.added).toBe(1);
    expect(imported?.id).toBe("comment_fixture_valid");
    expect(imported?.projectId).toBe("fixture-project");
    expect(imported?.pathname).toBe("/");
    expect(imported?.url).toBe("http://localhost/");
    expect(imported?.message).toBe("Imported fixture comment");
    expect(imported?.page.path).toBe("/");
    expect(imported?.page.url).toBe("http://localhost/");
    expect(imported?.target.position.relativeX).toBe(0.5);
    expect(imported?.target.position.relativeY).toBe(0.5);
  });

  it("imports older array-shaped exports safely", () => {
    const comment = createComment();
    const result = mergeImportedComments([], [comment]);

    expect(result.errors).toEqual([]);
    expect(result.added).toBe(1);
    expect(result.comments[0]?.id).toBe(comment.id);
  });

  it("does not crash on invalid JSON", () => {
    const existing = createComment();
    const result = mergeImportedComments([existing], invalidJson);

    expect(result.imported).toBe(0);
    expect(result.comments).toEqual([existing]);
    expect(result.errors[0]).toContain("Invalid JSON");
  });

  it("does not crash on unsupported file shapes", () => {
    const result = mergeImportedComments([], { schemaVersion: 1, items: [] });

    expect(result.imported).toBe(0);
    expect(result.errors[0]).toContain("comments array");
  });

  it("skips duplicates when importing the same file twice", () => {
    const comment = createComment();
    const first = mergeImportedComments([], { comments: [comment] });
    const second = mergeImportedComments(first.comments, {
      comments: [comment],
    });

    expect(first.added).toBe(1);
    expect(second.imported).toBe(0);
    expect(second.skipped).toBe(1);
    expect(second.comments).toHaveLength(1);
  });

  it("skips duplicate comments inside one import file", () => {
    const result = mergeImportedComments([], duplicateCommentsJson);

    expect(result.total).toBe(2);
    expect(result.added).toBe(1);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.comments).toHaveLength(1);
  });

  it("replaces an existing comment only when the imported copy is newer", () => {
    const existing = createComment("Old copy");
    const newer = {
      ...existing,
      text: "New copy",
      updatedAt: new Date(Date.now() + 1000).toISOString(),
    };
    const older = {
      ...existing,
      text: "Older copy",
      updatedAt: new Date(Date.now() - 1000).toISOString(),
    };

    const olderResult = mergeImportedComments([existing], {
      comments: [older],
    });
    const newerResult = mergeImportedComments([existing], {
      comments: [newer],
    });

    expect(olderResult.comments[0]?.text).toBe("Old copy");
    expect(olderResult.skipped).toBe(1);
    expect(newerResult.comments[0]?.text).toBe("New copy");
    expect(newerResult.updated).toBe(1);
  });

  it("keeps an existing local comment when imported updatedAt is missing", () => {
    const existing = createComment("Local copy");
    const importedWithoutUpdatedAt = {
      ...existing,
      text: "Imported copy",
    } as Record<string, unknown>;
    delete importedWithoutUpdatedAt.updatedAt;

    const result = mergeImportedComments([existing], {
      comments: [importedWithoutUpdatedAt],
    });

    expect(result.comments[0]?.text).toBe("Local copy");
    expect(result.skipped).toBe(1);
  });

  it("skips invalid comment records without rejecting the whole file", () => {
    const validExport = JSON.parse(validPinoteExportJson) as {
      comments: unknown[];
    };
    const result = mergeImportedComments([], {
      comments: [{ id: "missing-required-fields" }, validExport.comments[0]],
    });

    expect(result.total).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.added).toBe(1);
    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]?.id).toBe("comment_fixture_valid");
  });

  it("keeps imported comments scoped to their original pages", () => {
    const homeComment = createComment("Home");
    const reviewComment = {
      ...createComment("Review"),
      page: {
        ...homeComment.page,
        path: "/review",
        route: "/review",
      },
    };

    const result = mergeImportedComments([], {
      comments: [homeComment, reviewComment],
    });

    expect(result.comments.map((comment) => comment.page.path).sort()).toEqual([
      "/",
      "/review",
    ]);
  });
});
