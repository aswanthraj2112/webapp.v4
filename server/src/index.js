import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from './config.js';
import authRoutes from './auth/auth.routes.js';
import videoRoutes from './videos/video.routes.js';
import { errorHandler, NotFoundError } from './utils/errors.js';
import adminRoutes from './admin/admin.routes.js';

const app = express();

app.use(cors({
  origin: config.CLIENT_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for local development
if (config.USE_LOCAL_STORAGE) {
  app.use('/static/videos', express.static(config.PUBLIC_VIDEOS_DIR));
  app.use('/static/thumbs', express.static(config.PUBLIC_THUMBS_DIR));
}

app.get('/', (req, res) => {
  res.json({
    message: 'Video Web Application API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      videos: '/api/videos'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config', (req, res) => {
  res.json({
    cognito: {
      userPoolId: config.COGNITO_USER_POOL_ID,
      clientId: config.COGNITO_CLIENT_ID,
      region: config.AWS_REGION
    },
    domain: config.DOMAIN_NAME,
    api: {
      baseUrl: `/api`
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res, next) => {
  next(new NotFoundError('Route not found'));
});

app.use(errorHandler);

const start = async () => {
  console.log('🚀 Starting server...');

  // Initialize all configurations (Parameter Store + Secrets Manager)
  console.log('� Loading configuration from AWS Parameter Store and Secrets Manager...');
  await config.initialize();

  app.listen(config.PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${config.PORT}`);
    console.log(`Available at: ${config.DOMAIN_NAME || 'http://n11817143-videoapp.cab432.com'}:${config.PORT}`);
    console.log(`JWT Secret loaded: ${config.JWT_SECRET ? '✅ From Secrets Manager' : '⚠️  Fallback'}`);
    console.log(`Configuration loaded: ${config.S3_BUCKET ? '✅ From Parameter Store' : '⚠️  Fallback'}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
