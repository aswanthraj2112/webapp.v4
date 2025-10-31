import dotenv from 'dotenv';
import { loadAppConfig } from '../utils/parameterStore.js';
import { getJWTSecret } from '../utils/secrets.js';

dotenv.config();

const defaultOrigin = 'https://n11817143-videoapp.cab432.com';
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN;

const parsedOrigins = rawOrigins
    ? rawOrigins
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

if (parsedOrigins.length === 0) {
    parsedOrigins.push(defaultOrigin);
}

const config = {
    // Service identification
    SERVICE_NAME: process.env.SERVICE_NAME || 'video-api',
    PORT: Number.parseInt(process.env.PORT || '8080', 10),
    AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
    CLIENT_ORIGINS: parsedOrigins,

    // Domain configuration
    DOMAIN_NAME: 'n11817143-videoapp.cab432.com',
    ROUTE53_DOMAIN: 'n11817143-videoapp.cab432.com',
    PARAMETER_PREFIX: '/n11817143/app/',

    // Cognito configuration
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'ap-southeast-2_CdVnmKfW',
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || null,

    // Storage & persistence
    S3_BUCKET: 'n11817143-a2',
    S3_RAW_PREFIX: 'raw/',
    S3_TRANSCODED_PREFIX: 'transcoded/',
    S3_THUMBNAIL_PREFIX: 'thumbnails/',
    PRESIGNED_URL_TTL: Number.parseInt(process.env.PRESIGNED_URL_TTL || '900', 10),
    MAX_UPLOAD_SIZE_MB: Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || '512', 10),

    // Database
    DYNAMO_TABLE: 'n11817143-VideoApp',
    DYNAMO_OWNER_INDEX: process.env.DYNAMO_OWNER_INDEX || 'ownerId-index',

    // Cache configuration
    ELASTICACHE_ENDPOINT: process.env.ELASTICACHE_ENDPOINT || 'n11817143-a2-cache.km2jzi.0001.apse2.cache.amazonaws.com:11211',
    CACHE_TTL_SECONDS: Number.parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
    CACHE_ENABLED: process.env.CACHE_ENABLED !== 'false',

    // SQS Queues (for transcode-worker)
    TRANSCODE_QUEUE_URL: process.env.TRANSCODE_QUEUE_URL || '',

    // Authorization
    ADMIN_GROUP: process.env.ADMIN_GROUP || 'admin',

    // CloudWatch metrics
    CLOUDWATCH_NAMESPACE: process.env.CLOUDWATCH_NAMESPACE || 'VideoApp/Microservices',
    METRICS_ENABLED: process.env.METRICS_ENABLED !== 'false',

    // Health check
    HEALTH_CHECK_INTERVAL: Number.parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10)
};

config.initialize = async function () {
    try {
        console.log(`🚀 Initializing ${this.SERVICE_NAME} service...`);

        // Load configuration from Parameter Store (with fallback)
        let paramConfig = {};
        try {
            paramConfig = await loadAppConfig();
        } catch (error) {
            console.warn('⚠️  Parameter Store loading failed, using defaults:', error.message);
        }

        this.COGNITO_CLIENT_ID = paramConfig.COGNITO_CLIENT_ID || this.COGNITO_CLIENT_ID;
        this.DYNAMO_TABLE = paramConfig.DYNAMO_TABLE || this.DYNAMO_TABLE;
        this.DYNAMO_OWNER_INDEX = paramConfig.DYNAMO_OWNER_INDEX || this.DYNAMO_OWNER_INDEX;
        this.S3_BUCKET = paramConfig.S3_BUCKET || this.S3_BUCKET;
        this.S3_RAW_PREFIX = paramConfig.S3_RAW_PREFIX || this.S3_RAW_PREFIX;
        this.S3_TRANSCODED_PREFIX = paramConfig.S3_TRANSCODED_PREFIX || this.S3_TRANSCODED_PREFIX;
        this.S3_THUMBNAIL_PREFIX = paramConfig.S3_THUMBNAIL_PREFIX || this.S3_THUMBNAIL_PREFIX;
        this.PRESIGNED_URL_TTL = paramConfig.PRESIGNED_URL_TTL || this.PRESIGNED_URL_TTL;
        this.MAX_UPLOAD_SIZE_MB = paramConfig.MAX_UPLOAD_SIZE_MB || this.MAX_UPLOAD_SIZE_MB;
        this.DOMAIN_NAME = paramConfig.DOMAIN_NAME || this.DOMAIN_NAME;

        // Load JWT secret from Secrets Manager (only for API services)
        if (this.SERVICE_NAME !== 'transcode-worker') {
            try {
                const jwtSecret = await getJWTSecret();
                if (jwtSecret && jwtSecret !== process.env.JWT_SECRET) {
                    this.JWT_SECRET = jwtSecret;
                    this.JWT_SECRET_SOURCE = 'Secrets Manager';
                } else {
                    this.JWT_SECRET_SOURCE = 'Environment Variable';
                }
            } catch (error) {
                console.warn('⚠️  Failed to load JWT secret from Secrets Manager. Using environment variable.', error.message);
                this.JWT_SECRET_SOURCE = 'Environment Variable';
            }
        }

        console.log('✅ Configuration loaded');
        console.log(`   Service: ${this.SERVICE_NAME}`);
        console.log(`   Port: ${this.PORT}`);
        console.log(`   Cognito User Pool: ${this.COGNITO_USER_POOL_ID}`);
        console.log(`   Cognito Client ID: ${this.COGNITO_CLIENT_ID || 'not set'}`);
        console.log(`   S3 Bucket: ${this.S3_BUCKET}`);
        console.log(`   DynamoDB Table: ${this.DYNAMO_TABLE}`);
        console.log(`   Cache: ${this.CACHE_ENABLED ? this.ELASTICACHE_ENDPOINT : 'disabled'}`);
        console.log(`   Metrics: ${this.METRICS_ENABLED ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.warn('⚠️  Failed to load configuration from Parameter Store. Using defaults.', error.message);
    }
};

config.CLIENT_ORIGIN = config.CLIENT_ORIGINS[0];

export default config;
