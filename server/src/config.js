import dotenv from 'dotenv';
import { loadAppConfig } from './utils/parameterStore.js';

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
  PORT: Number.parseInt(process.env.PORT || '8080', 10),
  AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
  CLIENT_ORIGINS: parsedOrigins,
  DOMAIN_NAME: 'n11817143-videoapp.cab432.com',
  ROUTE53_DOMAIN: 'n11817143-videoapp.cab432.com',
  EC2_CNAME_TARGET: 'ec2-3-27-210-9.ap-southeast-2.compute.amazonaws.com',
  PARAMETER_PREFIX: '/n11817143/app/',

  // Cognito configuration
  COGNITO_USER_POOL_ID: 'ap-southeast-2_CdVnmKfrW',
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
  ELASTICACHE_ENDPOINT: process.env.ELASTICACHE_ENDPOINT || 'n11817143-a2-cache.cfg.apse2.cache.amazonaws.com:11211',
  CACHE_TTL_SECONDS: Number.parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),

  // Authorization
  ADMIN_GROUP: process.env.ADMIN_GROUP || 'admins'
};

config.initialize = async function () {
  try {
    const paramConfig = await loadAppConfig();

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

    console.log('✅ Configuration loaded');
    console.log(`   Cognito User Pool: ${this.COGNITO_USER_POOL_ID}`);
    console.log(`   Cognito Client ID: ${this.COGNITO_CLIENT_ID || 'not set'}`);
    console.log(`   S3 Bucket: ${this.S3_BUCKET}`);
    console.log(`   DynamoDB Table: ${this.DYNAMO_TABLE}`);
    console.log(`   Cache endpoint: ${this.ELASTICACHE_ENDPOINT}`);
  } catch (error) {
    console.warn('⚠️  Failed to load configuration from Parameter Store. Using defaults.', error.message);
  }
};

config.CLIENT_ORIGIN = config.CLIENT_ORIGINS[0];

export default config;
