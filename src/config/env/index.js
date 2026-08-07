const { z } = require("zod")

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]),

    // MongoDB
    MONGODB_URI: z.string().optional(),
    MONGODB_URI_DEV: z.string().optional(),
    MONGODB_URI_PROD: z.string().optional(),
    MONGODB_URI_TEST: z.string().optional(),
    MONGODB_USERNAME: z.string().optional(),
    MONGODB_PASSWORD: z.string().optional(),

    // JWT
    JWT_SECRET: z.string(),
    JWT_EXPIRES_IN: z.string().default("15m"),

    // Refresh Token
    REFRESH_TOKEN_EXPIRY_DAYS: z.string().default("7"),

    // Porta
    PORT: z.string().default("3000"),

    // CORS
    ALLOWED_ORIGINS: z.string().optional(),

    // Redis (opcional)
    REDIS_URL: z.string().optional(),

    // Sentry (opcional)
    SENTRY_DSN: z.string().optional(),

    // Google Cloud Storage (opcional)
    GCS_BUCKET_NAME: z.string().optional(),
    GCS_CREDENTIALS: z.string().optional(),
});

const env = envSchema.parse(process.env);

module.exports = env;
