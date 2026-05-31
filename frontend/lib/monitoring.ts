// Monitoring service - simplified version
export const MonitoringService = {
  addBreadcrumb: (message: string, category: string, data?: Record<string, any>) => {
    // Placeholder for monitoring
    console.log(`[${category}] ${message}`, data);
  },
  
  captureException: (error: Error, context?: Record<string, any>) => {
    // Placeholder for error tracking
    console.error('Exception:', error, context);
  },

  captureMessage: (message: string, level?: string) => {
    console.log(`[${level || 'info'}] ${message}`);
  },

  setUser: (user: { id: string; email?: string; name?: string }) => {
    console.log('User set:', user);
  },
};
