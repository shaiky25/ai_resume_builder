import { Fragment, createElement, type ReactNode } from "react";

/**
 * Converts a limited, safe subset of inline markdown (**bold**, *italic*,
 * `code`, and line breaks) into React nodes. No HTML is ever parsed or
 * injected — unsupported markup (links, headings, lists, etc.) is left as
 * plain text rather than causing an error or being dropped.
 */
export function formatInlineMarkdown(text: string): ReactNode[] {
  return text.split("\n").flatMap((line, lineIndex, lines) => {
    const nodes = formatLine(line, `line-${lineIndex}`);
    if (lineIndex < lines.length - 1) {
      nodes.push(createElement("br", { key: `br-${lineIndex}` }));
    }
    return nodes;
  });
}

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/;

function formatLine(line: string, keyPrefix: string): ReactNode[] {
  if (!line) return [createElement(Fragment, { key: keyPrefix })];

  return line
    .split(INLINE_PATTERN)
    .filter((segment) => segment.length > 0)
    .map((segment, index) => {
      const key = `${keyPrefix}-${index}`;

      if (segment.startsWith("**") && segment.endsWith("**") && segment.length >= 4) {
        return createElement("strong", { key }, segment.slice(2, -2));
      }
      if (segment.startsWith("`") && segment.endsWith("`") && segment.length >= 2) {
        return createElement(
          "code",
          {
            key,
            className:
              "rounded bg-zinc-900/10 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-50/10",
          },
          segment.slice(1, -1),
        );
      }
      if (segment.startsWith("*") && segment.endsWith("*") && segment.length >= 2) {
        return createElement("em", { key }, segment.slice(1, -1));
      }
      return createElement(Fragment, { key }, segment);
    });
}
