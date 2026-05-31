const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, error?: Error | unknown, ...args: unknown[]) => {
    console.error(
      `[ERROR] ${new Date().toISOString()} - ${message}`,
      error,
      ...args
    );
    if (error instanceof Error && isDevelopment) {
      console.error(error.stack);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  },
};
