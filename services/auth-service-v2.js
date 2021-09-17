// const jwt = require('jsonwebtoken');
// const userService = require('./user-service-v2');
const userApi = require('../apis/user-api');

/**
 * @param {String} userIdentifier Can be MongoId, email, phone or username
 * @param {String} userPw
 * @returns {Object | undefined}
 */
exports.doLogin = async (userIdentifier, userPw) => {
  // Check if user exists
  const currentUser = await userApi.getUserByIdEmailPhoneOrUsername(userIdentifier);
  if (!currentUser) return undefined;

  // check password
  if (currentUser !== userPw) return undefined;

  // TODO what else should be done here?

  return {
    ...currentUser,
    status: verification.status,
    existing: existingUser && existingUser.confirmed,
  };
};
