import {
    CognitoIdentityProviderClient,
    SignUpCommand,
    ConfirmSignUpCommand,
    ResendConfirmationCodeCommand,
    InitiateAuthCommand,
    RespondToAuthChallengeCommand
} from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import config from '../../../../shared/config/index.js';
import { getCognitoClientSecret } from '../../../../shared/utils/secrets.js';

const client = new CognitoIdentityProviderClient({ region: config.AWS_REGION });
let cachedSecret;

const requireClientId = () => {
    if (!config.COGNITO_CLIENT_ID) {
        throw new Error('Cognito client ID not configured');
    }
    return config.COGNITO_CLIENT_ID;
};

async function getClientSecret() {
    if (cachedSecret === undefined) {
        try {
            const secret = await getCognitoClientSecret();
            cachedSecret = typeof secret === 'string' ? secret : secret?.cognitoClientSecret;
        } catch {
            cachedSecret = null;
        }
    }
    return cachedSecret;
}

async function buildSecretHash(username) {
    const clientSecret = await getClientSecret();
    if (!clientSecret) {
        return undefined;
    }
    const message = `${username}${requireClientId()}`;
    return crypto.createHmac('SHA256', clientSecret).update(message).digest('base64');
}

const mapTokens = (authResult) => ({
    accessToken: authResult.AccessToken,
    idToken: authResult.IdToken,
    refreshToken: authResult.RefreshToken,
    tokenType: authResult.TokenType,
    expiresIn: authResult.ExpiresIn
});

function normalizeChallenge(response) {
    return {
        challenge: {
            name: response.ChallengeName,
            parameters: response.ChallengeParameters,
            session: response.Session
        }
    };
}

class CognitoService {
    async signUp(username, password, email) {
        const secretHash = await buildSecretHash(username);
        const command = new SignUpCommand({
            ClientId: requireClientId(),
            Username: username,
            Password: password,
            SecretHash: secretHash,
            UserAttributes: [
                { Name: 'email', Value: email }
            ]
        });
        const response = await client.send(command);
        return {
            userSub: response.UserSub,
            username,
            needsConfirmation: !response.UserConfirmed
        };
    }

    async confirmSignUp(username, code) {
        const secretHash = await buildSecretHash(username);
        const command = new ConfirmSignUpCommand({
            ClientId: requireClientId(),
            Username: username,
            ConfirmationCode: code,
            SecretHash: secretHash
        });
        await client.send(command);
    }

    async resendConfirmationCode(username) {
        const secretHash = await buildSecretHash(username);
        const command = new ResendConfirmationCodeCommand({
            ClientId: requireClientId(),
            Username: username,
            SecretHash: secretHash
        });
        await client.send(command);
    }

    async signIn(username, password) {
        const secretHash = await buildSecretHash(username);
        const command = new InitiateAuthCommand({
            ClientId: requireClientId(),
            AuthFlow: 'USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: username,
                PASSWORD: password,
                ...(secretHash ? { SECRET_HASH: secretHash } : {})
            }
        });

        const response = await client.send(command);

        if (response.ChallengeName) {
            return normalizeChallenge(response);
        }

        if (!response.AuthenticationResult) {
            throw new Error('Authentication failed');
        }

        return { tokens: mapTokens(response.AuthenticationResult) };
    }

    async respondToChallenge({ session, challengeName, challengeResponses }) {
        const username = challengeResponses?.USERNAME || challengeResponses?.username;
        const secretHash = username ? await buildSecretHash(username) : undefined;
        const command = new RespondToAuthChallengeCommand({
            ClientId: requireClientId(),
            Session: session,
            ChallengeName: challengeName,
            ChallengeResponses: {
                ...challengeResponses,
                ...(secretHash ? { SECRET_HASH: secretHash } : {})
            }
        });

        const response = await client.send(command);

        if (response.ChallengeName) {
            return normalizeChallenge(response);
        }

        if (!response.AuthenticationResult) {
            throw new Error('Authentication challenge failed');
        }

        return { tokens: mapTokens(response.AuthenticationResult) };
    }

    async refreshTokens({ refreshToken, username }) {
        const secretHash = await buildSecretHash(username);
        const command = new InitiateAuthCommand({
            ClientId: config.COGNITO_CLIENT_ID,
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
                REFRESH_TOKEN: refreshToken,
                USERNAME: username,
                ...(secretHash ? { SECRET_HASH: secretHash } : {})
            }
        });

        const response = await client.send(command);
        if (!response.AuthenticationResult) {
            throw new Error('Unable to refresh tokens');
        }

        const tokens = mapTokens(response.AuthenticationResult);
        return {
            ...tokens,
            refreshToken: tokens.refreshToken || refreshToken
        };
    }
}

export default new CognitoService();
