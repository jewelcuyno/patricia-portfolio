export function educationActivities(...values) {
  return values.flatMap((value) =>
    typeof value === "string"
      ? value
          .split(/\r?\n/)
          .map((item) => item.trim().replace(/^[-*•]\s*/, ""))
          .filter(Boolean)
      : [],
  );
}
