import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import config from '../../../shared/config/index.js';
import { initializeVerifiers } from '../../../shared/auth/middleware.js';
import { errorHandler } from '../../../shared/utils/errors.js';
import adminRoutes from './admin/admin.routes.js';

const app = express();

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (config.CLIENT_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`⚠️  CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Health check endpoints
app.get('/healthz', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: config.SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: config.SERVICE_NAME,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API routes
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: 'Route not found',
            code: 'NOT_FOUND',
            path: req.path
        }
    });
});

// Error handler
app.use(errorHandler);

// Startup function
async function startServer() {
    try {
        // Set service name before initializing config
        config.SERVICE_NAME = 'admin-service';

        // Initialize configuration
        await config.initialize();

        // Initialize JWT verifiers after config is loaded
        initializeVerifiers(config);

        // Start server
        const port = config.PORT;
        app.listen(port, '0.0.0.0', () => {
            console.log('');
            console.log('🚀 ════════════════════════════════════════════════════════');
            console.log('   ADMIN SERVICE STARTED');
            console.log('   ════════════════════════════════════════════════════════');
            console.log(`   📡 Port:        ${port}`);
            console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   🔐 Auth:        Cognito (${config.COGNITO_USER_POOL_ID})`);
            console.log(`   💾 Database:    DynamoDB (${config.DYNAMO_TABLE})`);
            console.log(`   📦 Storage:     S3 (${config.S3_BUCKET})`);
            console.log(`   👮 Admin Only:  Requires admin group membership`);
            console.log('   ════════════════════════════════════════════════════════');
            console.log('');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
startServer();

export default app;
