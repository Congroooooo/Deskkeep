import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Notes render as Markdown without raw HTML (react-markdown escapes it), so a pasted
// or imported file cannot run scripts. Links are shown as text and never navigate the app.
const components: Components = {
  a: ({ href, children }) => (
    <span className="md-link" title={href}>
      {children}
    </span>
  ),
  img: ({ alt }) => <span className="md-image-note">[image: {alt || "untitled"}]</span>,
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

// Plain-text snippet for list rows: strips the Markdown symbols.
export function markdownSnippet(source: string, length = 80) {
  const plain = source
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_>#~|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, length);
}
