/**
 * PackagePro Central Configuration
 * Loads and validates all environment variables
 */

import { z } from "zod"

// ============================================================================
// Configuration Schema
// ============================================================================

const configSchema = z.object({
  // Database
  database: z.object({
    url: z.string().url(),
  }),

  // Authentication
  auth: z.object({
    nextAuthUrl: z.string().url(),
    nextAuthSecret: z.string().min(32),
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default("7d"),
  }),

  // Redis
  redis: z.object({
    url: z.string().url(),
    password: z.string().optional(),
    db: z.number().default(0),
  }),

  // Message Queue
  queue: z.object({
    type: z.enum(["rabbitmq", "sqs"]).default("rabbitmq"),
    rabbitmqUrl: z.string().url().optional(),
    queuePrefix: z.string().default("packagepro"),
    awsRegion: z.string().optional(),
    awsAccessKeyId: z.string().optional(),
    awsSecretAccessKey: z.string().optional(),
  }),

  // S3 Storage
  s3: z.object({
    endpoint: z.string().url(),
    region: z.string(),
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
    bucket: z.string(),
    useSSL: z.boolean().default(false),
  }),

  // Stripe
  stripe: z.object({
    secretKey: z.string(),
    publishableKey: z.string(),
    webhookSecret: z.string(),
  }),

  // Shipping
  shipping: z.object({
    easypostApiKey: z.string().optional(),
    shipengineApiKey: z.string().optional(),
  }),

  // Email
  email: z.object({
    smtpHost: z.string(),
    smtpPort: z.number(),
    smtpUser: z.string(),
    smtpPass: z.string(),
    smtpFrom: z.string().email(),
  }),

  // Monitoring
  monitoring: z.object({
    sentryDsn: z.string().optional(),
    sentryEnvironment: z.string().default("development"),
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
  }),

  // Feature Flags
  features: z.object({
    enableSupplierRouting: z.boolean().default(true),
    enableAutoFailover: z.boolean().default(true),
    enablePriceCache: z.boolean().default(true),
  }),

  // API Settings
  api: z.object({
    rateLimitPerMinute: z.number().default(60),
    rateLimitBurst: z.number().default(10),
    corsOrigins: z.array(z.string().url()),
  }),

  // Pricing Engine
  pricing: z.object({
    defaultPlatformMargin: z.number().default(0.15),
    cacheTtl: z.number().default(3600),
  }),

  // Supplier Routing
  supplierRouting: z.object({
    confirmationTimeoutHours: z.number().default(24),
    autoFailoverEnabled: z.boolean().default(true),
  }),

  // General
  env: z.enum(["development", "staging", "production"]).default("development"),
  port: z.number().default(3000),
})

export type PackageProConfig = z.infer<typeof configSchema>

// ============================================================================
// Configuration Loader
// ============================================================================

function loadConfig(): PackageProConfig {
  // Helper to get env var with fallback
  const getEnv = (key: string, defaultValue?: string): string => {
    const value = process.env[key]
    if (!value && !defaultValue) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value || defaultValue!
  }

  const getEnvNumber = (key: string, defaultValue?: number): number => {
    const value = process.env[key]
    if (!value && defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`)
    }
    return value ? Number.parseInt(value, 10) : defaultValue!
  }

  const getEnvBoolean = (key: string, defaultValue: boolean = false): boolean => {
    const value = process.env[key]
    if (!value) return defaultValue
    return value.toLowerCase() === "true"
  }

  const getEnvArray = (key: string, separator: string = ","): string[] => {
    const value = process.env[key]
    if (!value) return []
    return value.split(separator).map((item) => item.trim()).filter(Boolean)
  }

  const rawConfig = {
    database: {
      url: getEnv("DATABASE_URL"),
    },
    auth: {
      nextAuthUrl: getEnv("NEXTAUTH_URL", "http://localhost:3000"),
      nextAuthSecret: getEnv("NEXTAUTH_SECRET"),
      jwtSecret: getEnv("JWT_SECRET"),
      jwtExpiresIn: getEnv("JWT_EXPIRES_IN", "7d"),
    },
    redis: {
      url: getEnv("REDIS_URL", "redis://localhost:6379"),
      password: process.env.REDIS_PASSWORD,
      db: getEnvNumber("REDIS_DB", 0),
    },
    queue: {
      type: (process.env.QUEUE_TYPE || "rabbitmq") as "rabbitmq" | "sqs",
      rabbitmqUrl: process.env.RABBITMQ_URL,
      queuePrefix: getEnv("RABBITMQ_QUEUE_PREFIX", "packagepro"),
      awsRegion: process.env.AWS_REGION,
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    s3: {
      endpoint: getEnv("S3_ENDPOINT", "http://localhost:9000"),
      region: getEnv("S3_REGION", "us-east-1"),
      accessKeyId: getEnv("S3_ACCESS_KEY_ID"),
      secretAccessKey: getEnv("S3_SECRET_ACCESS_KEY"),
      bucket: getEnv("S3_BUCKET", "packagepro-designs"),
      useSSL: getEnvBoolean("S3_USE_SSL", false),
    },
    stripe: {
      secretKey: getEnv("STRIPE_SECRET_KEY"),
      publishableKey: getEnv("STRIPE_PUBLISHABLE_KEY"),
      webhookSecret: getEnv("STRIPE_WEBHOOK_SECRET"),
    },
    shipping: {
      easypostApiKey: process.env.EASYPOST_API_KEY,
      shipengineApiKey: process.env.SHIPENGINE_API_KEY,
    },
    email: {
      smtpHost: getEnv("SMTP_HOST"),
      smtpPort: getEnvNumber("SMTP_PORT", 587),
      smtpUser: getEnv("SMTP_USER"),
      smtpPass: getEnv("SMTP_PASS"),
      smtpFrom: getEnv("SMTP_FROM", "noreply@packagepro.com"),
    },
    monitoring: {
      sentryDsn: process.env.SENTRY_DSN,
      sentryEnvironment: getEnv("SENTRY_ENVIRONMENT", "development"),
      logLevel: (getEnv("LOG_LEVEL", "info") || "info") as "debug" | "info" | "warn" | "error",
    },
    features: {
      enableSupplierRouting: getEnvBoolean("ENABLE_SUPPLIER_ROUTING", true),
      enableAutoFailover: getEnvBoolean("ENABLE_AUTO_FAILOVER", true),
      enablePriceCache: getEnvBoolean("ENABLE_PRICE_CACHE", true),
    },
    api: {
      rateLimitPerMinute: getEnvNumber("API_RATE_LIMIT_PER_MINUTE", 60),
      rateLimitBurst: getEnvNumber("API_RATE_LIMIT_BURST", 10),
      corsOrigins: getEnvArray("CORS_ORIGINS", ",").length > 0
        ? getEnvArray("CORS_ORIGINS", ",")
        : ["http://localhost:3000"],
    },
    pricing: {
      defaultPlatformMargin: Number.parseFloat(getEnv("DEFAULT_PLATFORM_MARGIN", "0.15")),
      cacheTtl: getEnvNumber("PRICING_CACHE_TTL", 3600),
    },
    supplierRouting: {
      confirmationTimeoutHours: getEnvNumber("SUPPLIER_CONFIRMATION_TIMEOUT_HOURS", 24),
      autoFailoverEnabled: getEnvBoolean("AUTO_FAILOVER_ENABLED", true),
    },
    env: (process.env.NODE_ENV || "development") as "development" | "staging" | "production",
    port: getEnvNumber("PORT", 3000),
  }

  // Validate configuration
  try {
    return configSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingFields = error.issues.map((e: any) => `${e.path.join(".")}: ${e.message}`).join("\n")
      throw new Error(`Configuration validation failed:\n${missingFields}`)
    }
    throw error
  }
}

// Export singleton instance
let configInstance: PackageProConfig | null = null

export function getConfig(): PackageProConfig {
  if (!configInstance) {
    configInstance = loadConfig()
  }
  return configInstance
}

// Export for testing
export function resetConfig() {
  configInstance = null
}

// Export individual config sections for convenience
// Importing retired routes during a Next build must not require runtime secrets.
// Actual use still validates the complete configuration, without dummy values.
export const config = new Proxy({} as PackageProConfig, {
  get(_target, key: keyof PackageProConfig) { return getConfig()[key] },
})

