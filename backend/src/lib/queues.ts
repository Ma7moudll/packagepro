import { Queue } from 'bullmq';
import { getRedisClient, isRedisEnabled } from './redis';

// Create queues only if Redis is enabled
let emailQueue: Queue | null = null;
let settlementQueue: Queue | null = null;
let reminderQueue: Queue | null = null;
let marketingQueue: Queue | null = null;

function initializeQueues() {
  const redis = getRedisClient();
  
  if (redis && isRedisEnabled()) {
    try {
      emailQueue = new Queue('email-queue', {
        connection: redis,
      });

      settlementQueue = new Queue('settlement-queue', {
        connection: redis,
      });

      reminderQueue = new Queue('reminder-queue', {
        connection: redis,
      });

      marketingQueue = new Queue('marketing-queue', {
        connection: redis,
      });
    } catch (error) {
      // Queues will remain null
    }
  }
}

// Initialize queues lazily
let queuesInitialized = false;
export function initializeQueuesIfNeeded() {
  if (!queuesInitialized) {
    initializeQueues();
    queuesInitialized = true;
  }
}

// Helper functions to safely use queues
export function getEmailQueue(): Queue | null {
  initializeQueuesIfNeeded();
  return emailQueue;
}

export function getSettlementQueue(): Queue | null {
  initializeQueuesIfNeeded();
  return settlementQueue;
}

export function getReminderQueue(): Queue | null {
  initializeQueuesIfNeeded();
  return reminderQueue;
}

export function getMarketingQueue(): Queue | null {
  initializeQueuesIfNeeded();
  return marketingQueue;
}

// Export queues (may be null if Redis is not available)
export { emailQueue, settlementQueue, reminderQueue, marketingQueue };