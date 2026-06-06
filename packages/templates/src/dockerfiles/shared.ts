export function toShellArray(command: string): string {
  return JSON.stringify(["sh", "-c", command]);
}

export function joinDockerfile(lines: Array<string | null | undefined>): string {
  return lines
    .filter((line): line is string => line !== null && line !== undefined)
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n");
}
