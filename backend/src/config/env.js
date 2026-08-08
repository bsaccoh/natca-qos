import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/natca_cms',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_in_prod',
    accessTtl: Number(process.env.JWT_ACCESS_TTL) || 900,
    refreshTtl: Number(process.env.JWT_REFRESH_TTL) || 604800,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@natca.gov.sl',
  },
  corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean),
  faceMatchUrl: process.env.FACE_MATCH_URL || 'http://localhost:8001',
  seedAdmin: {
    email: process.env.SEED_ADMIN_EMAIL || 'admin@natca.gov.sl',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
    name: process.env.SEED_ADMIN_NAME || 'System Administrator',
  },
};
