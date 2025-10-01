export type MindMapOpLike = {
  type?: string;
  [key: string]: any;
};

export function normalizeMindMapOp(raw: MindMapOpLike | undefined | null) {
  if (!raw || typeof raw !== "object") return undefined;
  if (raw.type) return raw;
  const nestedKey = Object.keys(raw)[0];
  const value = nestedKey ? (raw as Record<string, any>)[nestedKey] : undefined;
  if (nestedKey && value && typeof value === "object") {
    return { type: nestedKey, ...value };
  }
  return undefined;
}

export function mindMapEdgeKey(sourceLabel?: string, targetLabel?: string, relation?: string) {
  return `${sourceLabel ?? ""}→${targetLabel ?? ""}#${relation ?? ""}`;
}
