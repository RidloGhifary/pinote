import { useRef, useState, type CSSProperties } from "react";
import {
  COMMENT_IGNORE_ATTRIBUTE,
  type CommentExportOptions,
  type LocalComment,
  usePinote,
  PinoteToolbar as BuiltInPinoteToolbar,
} from "pinotejs/react";
import "pinotejs/style.css";

const DEMO_PAGES = [
  { path: "/", label: "Overview" },
  { path: "/review", label: "Review" },
  { path: "/settings", label: "Settings" },
];

const visuallyHiddenFileInputStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  border: 0,
  opacity: 0,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  pointerEvents: "none",
} satisfies CSSProperties;

function navigateDemoPage(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

function ExportControls() {
  const {
    comments,
    currentPageComments,
    downloadCommentsExport,
    exportComments,
    importCommentsFromFile,
    importError,
    lastImportResult,
  } = usePinote();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("Choose an export option.");
  const openCount = comments.filter(
    (comment: LocalComment) => comment.status === "open",
  ).length;
  const resolvedCount = comments.filter(
    (comment: LocalComment) => comment.status === "resolved",
  ).length;

  function handleExport(label: string, options: CommentExportOptions) {
    const payload = exportComments(options);

    if (!payload || payload.summary.totalComments === 0) {
      setMessage(`No ${label.toLowerCase()} comments to export.`);
      return;
    }

    const filename = downloadCommentsExport(options);
    setMessage(
      filename
        ? `Downloaded ${payload.summary.totalComments} comments to ${filename}.`
        : "Export is unavailable in this environment.",
    );
  }

  async function handleImport(file: File | undefined) {
    if (!file) return;

    const result = await importCommentsFromFile(file);
    setMessage(
      result
        ? `Imported ${result.imported} comments (${result.added} added, ${result.updated} updated, ${result.skipped} skipped).`
        : "Import is unavailable in this environment.",
    );

    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  return (
    <section className="exportSection" data-rcl-ignore>
      <div className="sectionHeader">
        <h3>Import and export comments</h3>
        <p>{importError || message}</p>
      </div>
      <div className="buttonGrid">
        <button
          className="secondaryButton"
          disabled={comments.length === 0}
          onClick={() => handleExport("All", { scope: "all" })}
        >
          Export all ({comments.length})
        </button>
        <button
          className="secondaryButton"
          disabled={currentPageComments.length === 0}
          onClick={() => handleExport("Page", { scope: "current-page" })}
        >
          Export page ({currentPageComments.length})
        </button>
        <button
          className="secondaryButton"
          disabled={openCount === 0}
          onClick={() => handleExport("Open", { status: "open" })}
        >
          Export open ({openCount})
        </button>
        <button
          className="secondaryButton"
          disabled={resolvedCount === 0}
          onClick={() => handleExport("Resolved", { status: "resolved" })}
        >
          Export resolved ({resolvedCount})
        </button>
        <button
          className="secondaryButton"
          data-pinote-ui="true"
          data-rcl-ignore="true"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            importInputRef.current?.click();
          }}
          type="button"
        >
          Import JSON
        </button>
      </div>
      <input
        ref={importInputRef}
        accept=".json,application/json"
        aria-hidden="true"
        data-pinote-ui="true"
        data-rcl-ignore="true"
        onChange={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void handleImport(event.currentTarget.files?.[0]);
        }}
        style={visuallyHiddenFileInputStyle}
        tabIndex={-1}
        type="file"
      />
      {lastImportResult ? (
        <p className="importSummary">
          Last import: {lastImportResult.imported} merged,{" "}
          {lastImportResult.skipped} skipped.
        </p>
      ) : null}
    </section>
  );
}

function CommentListItem({ comment }: { comment: LocalComment }) {
  const { deleteComment, resolveComment, reopenComment, openComment } =
    usePinote();

  return (
    <div className="commentItem">
      <div className="commentContent">
        <p>{comment.text}</p>
        <span className="commentMeta">
          {comment.status} | {comment.page.path}
        </span>
      </div>
      <div className="commentActions">
        <button className="openBtn" onClick={() => openComment(comment.id)}>
          View
        </button>
        {comment.status === "open" ? (
          <button
            className="resolveBtn"
            onClick={() => resolveComment(comment.id)}
          >
            Resolve
          </button>
        ) : (
          <button
            className="reopenBtn"
            onClick={() => reopenComment(comment.id)}
          >
            Reopen
          </button>
        )}
        <button className="deleteBtn" onClick={() => deleteComment(comment.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function CommentManager() {
  const {
    comments,
    currentPageComments,
    pendingCommentDraft,
    clearLocalComments,
    currentPage,
  } = usePinote();

  const otherPageCount = comments.length - currentPageComments.length;

  return (
    <aside className="managerPanel" data-rcl-ignore>
      <div className="panelHeader">
        <div>
          <p className="eyebrow">Comment manager</p>
          <h2>Local feedback</h2>
        </div>
        <button
          className="ghostButton"
          disabled={comments.length === 0 && !pendingCommentDraft}
          onClick={clearLocalComments}
        >
          Clear local
        </button>
      </div>

      <dl className="summaryGrid">
        <div>
          <dt>Current page</dt>
          <dd>{currentPage?.path || "/"}</dd>
        </div>
        <div>
          <dt>Visible markers</dt>
          <dd>{currentPageComments.length}</dd>
        </div>
        <div>
          <dt>Other pages</dt>
          <dd>{otherPageCount}</dd>
        </div>
        <div>
          <dt>Draft</dt>
          <dd>{pendingCommentDraft ? "Open" : "None"}</dd>
        </div>
      </dl>

      <div className="listSection">
        <div className="listHeader">
          <h3>Current page comments</h3>
          <span>{currentPageComments.length}</span>
        </div>
        {currentPageComments.length > 0 ? (
          currentPageComments.map((comment: LocalComment) => (
            <CommentListItem key={comment.id} comment={comment} />
          ))
        ) : (
          <div className="emptyState compact">
            <p>No comments on this page yet.</p>
          </div>
        )}
      </div>

      <ExportControls />
    </aside>
  );
}

function RouteSwitcher() {
  const { currentPage } = usePinote();

  return (
    <nav className="routeSwitcher" aria-label="Demo pages" data-rcl-ignore>
      {DEMO_PAGES.map((page) => (
        <button
          key={page.path}
          className={
            currentPage?.path === page.path
              ? "routeButton isActive"
              : "routeButton"
          }
          onClick={() => navigateDemoPage(page.path)}
        >
          {page.label}
        </button>
      ))}
    </nav>
  );
}

function Toolbar() {
  const {
    comments,
    currentPageComments,
    isCommentModeEnabled,
    toggleCommentMode,
  } = usePinote();

  return (
    <div className="toolbar" data-rcl-ignore>
      <div className="status">
        {isCommentModeEnabled ? (
          <>
            <span className="dot active"></span>
            Comment mode active
          </>
        ) : (
          <>
            <span className="dot"></span>
            Browsing mode
          </>
        )}
      </div>
      <div className="stats">
        <span>{currentPageComments.length} on page</span>
        <span>{comments.length} total</span>
      </div>
      <button className="modeButton" onClick={toggleCommentMode}>
        {isCommentModeEnabled ? "Disable" : "Enable"}
      </button>
    </div>
  );
}

function PlaygroundContent() {
  const [count, setCount] = useState(0);

  return (
    <main className="playground">
      <header className="heroPanel">
        <div className="heroText">
          <p className="eyebrow">Framework-agnostic MVP</p>
          <h2>Comment, manage, reload, route, and export.</h2>
          <p>
            Enable comment mode, choose an element, save a note, then manage it
            locally. Markers persist after refresh and stay scoped to the
            current page path.
          </p>
        </div>
        <div className="heroActions">
          <button
            className="primaryButton"
            onClick={() => setCount((c) => c + 1)}
          >
            Counter: {count}
          </button>
          <a href="#" className="ghostButton">
            Documentation
          </a>
        </div>
      </header>

      <section className="gridSection">
        <div className="card" data-comment-anchor="feature-card">
          <div className="cardIcon">🎯</div>
          <h3>Precise Targeting</h3>
          <p>
            Click exactly where you want to leave feedback. We capture the DOM
            element and its context.
          </p>
        </div>
        <div className="card">
          <div className="cardIcon">💾</div>
          <h3>Local Storage</h3>
          <p>
            Your comments stay on your machine and export cleanly when you are
            ready to share them.
          </p>
        </div>
        <div className="card">
          <div className="cardIcon">📊</div>
          <h3>JSON Export</h3>
          <p>
            Ready to share? Export all your feedback into a clean JSON file for
            designers or developers.
          </p>
        </div>
      </section>

      <CommentManager />
    </main>
  );
}

export default function App() {
  return (
    <>
      <BuiltInPinoteToolbar />
      <Toolbar />
      <div className="modeHint" data-rcl-ignore>
        Controls use <code>{COMMENT_IGNORE_ATTRIBUTE}</code> so they stay usable
        while comment mode is active. Saved comments persist in localStorage and
        export as JSON.
      </div>
      <RouteSwitcher />
      <PlaygroundContent />
    </>
  );
}
