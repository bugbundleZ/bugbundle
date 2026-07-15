export interface RedactionResult {
  readonly text: string;
  readonly count: number;
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|ghp|github_pat)_[A-Za-z0-9_-]{12,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/gi,
];

const KEY_VALUE_SECRET_PATTERN =
  /\b(api[_-]?key|token|password|secret)(\s*[=:]\s*)(["']?)([^\s,;}"']+)\3/gi;

export function redactText(input: string, homeDirectory?: string): RedactionResult {
  let text = input;
  let count = 0;

  text = text.replace(KEY_VALUE_SECRET_PATTERN, (_match, key: string, separator: string, quote: string) => {
    count += 1;
    return `${key}${separator}${quote}[REDACTED_SECRET]${quote}`;
  });

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      count += 1;
      return "[REDACTED_SECRET]";
    });
  }

  if (homeDirectory) {
    const escapedHome = escapeRegExp(homeDirectory.replaceAll("\\", "/"));
    const homePattern = new RegExp(escapedHome, "gi");
    text = text.replaceAll("\\", "/").replace(homePattern, () => {
      count += 1;
      return "[HOME]";
    });
  }

  return { text, count };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
