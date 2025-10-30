import {
    CognitoIdentityProviderClient,
    ListUsersCommand,
    AdminDeleteUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import config from '../../../../shared/config/index.js';

const client = new CognitoIdentityProviderClient({ region: config.AWS_REGION });

class CognitoService {
    async listUsers() {
        const command = new ListUsersCommand({
            UserPoolId: config.COGNITO_USER_POOL_ID
        });
        const { Users = [] } = await client.send(command);
        return Users.map((user) => ({
            username: user.Username,
            status: user.UserStatus,
            enabled: user.Enabled,
            createdAt: user.UserCreateDate,
            updatedAt: user.UserLastModifiedDate,
            attributes: Object.fromEntries((user.Attributes || []).map(({ Name, Value }) => [Name, Value]))
        }));
    }

    async deleteUser(username) {
        const command = new AdminDeleteUserCommand({
            UserPoolId: config.COGNITO_USER_POOL_ID,
            Username: username
        });
        await client.send(command);
    }
}

export default new CognitoService();
