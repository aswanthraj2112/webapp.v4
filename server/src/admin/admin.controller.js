import cognitoService from '../auth/cognito.service.js';

export const listAllUsers = async (req, res) => {
  const users = await cognitoService.listUsers();
  res.json({ users });
};

export const deleteUser = async (req, res) => {
  const { username } = req.params;
  await cognitoService.deleteUser(username);
  res.status(204).send();
};
