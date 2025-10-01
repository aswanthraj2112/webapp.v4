import { getParameters, getParameterWithDefault } from './utils/parameterStore.js';
import config from './config.js';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
let configPromise;

export async function loadS3Config() {
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const params = await getParameters([
          's3Bucket',
          's3_raw_prefix',
          's3_transcoded_prefix',
          's3_thumbnail_prefix'
        ]);

        const preSignedTTL = await getParameterWithDefault('preSignedUrlTTL', '600');

        return {
          REGION,
          S3_BUCKET: params.s3Bucket || config.S3_BUCKET,
          RAW_PREFIX: params.s3_raw_prefix || config.S3_RAW_PREFIX,
          TRANSCODED_PREFIX: params.s3_transcoded_prefix || config.S3_TRANSCODED_PREFIX,
          THUMB_PREFIX: params.s3_thumbnail_prefix || config.S3_THUMBNAIL_PREFIX,
          PRESIGNED_TTL_SECONDS: Number.parseInt(preSignedTTL, 10)
        };
      } catch (error) {
        console.error('❌ Failed to load S3 configuration from Parameter Store:', error.message);
        return {
          REGION,
          S3_BUCKET: config.S3_BUCKET,
          RAW_PREFIX: config.S3_RAW_PREFIX,
          TRANSCODED_PREFIX: config.S3_TRANSCODED_PREFIX,
          THUMB_PREFIX: config.S3_THUMBNAIL_PREFIX,
          PRESIGNED_TTL_SECONDS: config.PRESIGNED_URL_TTL
        };
      }
    })();
  }
  return configPromise;
}
