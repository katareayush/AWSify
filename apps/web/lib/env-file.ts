export interface ParsedEnvLine {
  name: string;
  value: string;
  line: number;
}

export interface InvalidEnvLine {
  line: number;
  text: string;
  reason: string;
}

const NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export function parseEnvFile(input: string): { entries: ParsedEnvLine[]; invalid: InvalidEnvLine[] } {
  const entries: ParsedEnvLine[] = [];
  const invalid: InvalidEnvLine[] = [];

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
    const equalsIndex = withoutExport.indexOf("=");
    if (equalsIndex < 1) {
      invalid.push({ line: lineNumber, text: rawLine, reason: "Expected KEY=value." });
      return;
    }

    const name = withoutExport.slice(0, equalsIndex).trim();
    if (!NAME_PATTERN.test(name)) {
      invalid.push({ line: lineNumber, text: rawLine, reason: "Invalid variable name." });
      return;
    }

    entries.push({
      name,
      value: unquoteValue(withoutExport.slice(equalsIndex + 1).trim()),
      line: lineNumber
    });
  });

  return { entries, invalid };
}

function unquoteValue(value: string) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  const commentIndex = value.search(/\s+#/);
  return commentIndex >= 0 ? value.slice(0, commentIndex).trimEnd() : value;
}
