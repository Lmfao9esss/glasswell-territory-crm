export type ErrorSeverity = "info" | "warning" | "error" | "critical";

export type ErrorLogContext = {
  area?: string;
  operation?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type ErrorLogEvent = {
  message: string;
  severity: ErrorSeverity;
  context?: ErrorLogContext;
  error?: unknown;
  occurredAt: string;
};

export type ErrorLogger = {
  capture(event: ErrorLogEvent): void;
};

const errorLoggingEnabled =
  process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === "true";

class NoopErrorLogger implements ErrorLogger {
  capture() {
    return;
  }
}

class BrowserConsoleErrorLogger implements ErrorLogger {
  capture(event: ErrorLogEvent) {
    if (event.severity === "info") return;

    // Disabled unless explicitly enabled; useful while wiring a future provider.
    console.warn("[Glasswell error]", {
      message: event.message,
      severity: event.severity,
      context: event.context,
      occurredAt: event.occurredAt,
      error: event.error,
    });
  }
}

export const errorLogger: ErrorLogger = errorLoggingEnabled
  ? new BrowserConsoleErrorLogger()
  : new NoopErrorLogger();

export function captureError(
  error: unknown,
  message: string,
  context?: ErrorLogContext,
  severity: ErrorSeverity = "error",
) {
  errorLogger.capture({
    message,
    severity,
    context,
    error,
    occurredAt: new Date().toISOString(),
  });
}
