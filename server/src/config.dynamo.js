import { getParameters } from './utils/parameterStore.js';
import config from './config.js';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
let configPromise;

export async function loadDynamoConfig() {
  if (!configPromise) {
    configPromise = (async () => {
      try {
        const params = await getParameters([
          'dynamoTable',
          'dynamoOwnerIndex'
        ]);

        return {
          REGION,
          TABLE: params.dynamoTable || config.DYNAMO_TABLE,
          OWNER_INDEX: params.dynamoOwnerIndex || config.DYNAMO_OWNER_INDEX
        };
      } catch (error) {
        console.error('❌ Failed to load DynamoDB configuration from Parameter Store:', error.message);
        return {
          REGION,
          TABLE: config.DYNAMO_TABLE,
          OWNER_INDEX: config.DYNAMO_OWNER_INDEX
        };
      }
    })();
  }
  return configPromise;
}
