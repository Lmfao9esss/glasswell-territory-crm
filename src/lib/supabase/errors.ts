type SupabaseLikeError = {
  code?: unknown;
  details?: unknown;
  hint?: unknown;
  message?: unknown;
};

export function formatSupabaseError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (isSupabaseLikeError(error)) {
    const parts = [
      stringValue(error.message),
      prefixedValue("code", error.code),
      prefixedValue("details", error.details),
      prefixedValue("hint", error.hint),
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(" | ");
    }
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown failure.";
  }
}

function isSupabaseLikeError(error: unknown): error is SupabaseLikeError {
  return typeof error === "object" && error !== null;
}

function prefixedValue(label: string, value: unknown) {
  const text = stringValue(value);
  return text ? `${label}: ${text}` : null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
