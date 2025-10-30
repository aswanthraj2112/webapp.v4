import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({
    region: process.env.AWS_REGION || 'ap-southeast-2'
});

/**
 * Retrieves a secret from AWS Secrets Manager
 * @param {string} secretName - The name of the secret to retrieve
 * @returns {Promise<string|object>} The secret value
 */
export async function getSecret(secretName) {
    try {
        const command = new GetSecretValueCommand({
            SecretId: secretName
        });

        const response = await client.send(command);

        if (response.SecretString) {
            // Try to parse as JSON first (in case it's a key-value pair)
            try {
                const parsed = JSON.parse(response.SecretString);
                return parsed;
            } catch {
                // Return as plain string if not JSON
                return response.SecretString;
            }
        }

        if (response.SecretBinary) {
            // Handle binary secrets if needed
            return Buffer.from(response.SecretBinary).toString('utf-8');
        }

        throw new Error('No secret value found');
    } catch (error) {
        console.error(`Error retrieving secret ${secretName}:`, error.message);
        throw error;
    }
}

const SECRET_NAME = 'n11817143-a2-secret';

/**
 * Retrieves the Cognito app client secret from AWS Secrets Manager
 * @returns {Promise<string|null>} The client secret or null if unavailable
 */
export async function getCognitoClientSecret() {
    try {
        const secret = await getSecret(SECRET_NAME);

        if (typeof secret === 'string') {
            return secret;
        }

        if (typeof secret === 'object' && secret) {
            return secret.cognitoClientSecret || secret.clientSecret || null;
        }

        return null;
    } catch (error) {
        console.error('Failed to retrieve Cognito client secret:', error.message);
        return process.env.COGNITO_CLIENT_SECRET || null;
    }
}

/**
 * Retrieves the JWT secret from AWS Secrets Manager
 * @returns {Promise<string|null>} The JWT secret or null if unavailable
 */
export async function getJWTSecret() {
    try {
        const secret = await getSecret(SECRET_NAME);

        if (typeof secret === 'object' && secret) {
            const jwtSecret = secret.JWT_SECRET;
            if (jwtSecret) {
                console.log('JWT Secret loaded: ✅ From Secrets Manager');
                return jwtSecret;
            }
        }

        // Try fallback to environment variable
        const envSecret = process.env.JWT_SECRET;
        if (envSecret) {
            console.log('JWT Secret loaded: ⚠️  From Environment Variable');
            return envSecret;
        }

        // Generate a temporary secret for development
        const tempSecret = 'dev-jwt-secret-' + Math.random().toString(36).substring(2);
        console.log('JWT Secret loaded: ⚠️  Generated Temporary Secret (NOT FOR PRODUCTION)');
        return tempSecret;

    } catch (error) {
        console.error('Failed to retrieve JWT secret:', error.message);

        // Try environment variable as fallback
        const envSecret = process.env.JWT_SECRET;
        if (envSecret) {
            console.log('JWT Secret loaded: ⚠️  Environment Fallback');
            return envSecret;
        }

        // Generate a temporary secret as last resort
        const tempSecret = 'dev-jwt-secret-' + Math.random().toString(36).substring(2);
        console.log('JWT Secret loaded: ⚠️  Generated Fallback Secret');
        return tempSecret;
    }
}

export default { getSecret, getCognitoClientSecret, getJWTSecret };
