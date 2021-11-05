const { User } = require('@wallfair.io/wallfair-commons').models;

/**
 * @param {Object} userData
 * @param {string} userData.phone
 * @param {string} userData.email
 * @param {username} userData.username
 * @param {Array} userData.openBets
 * @param {Array} userData.closedBets
 * @param {Boolean} userData.confirmed
 * @param {Boolean} userData.admin
 * @param {Date} userData.date
 * @param {Birth} userData.birthdate //to do
 * @param {Country} userData.country //to do
 * @param {String} userData.password
 * @param {String} userData.passwordResetToken
 */
const createUser = async (userData) => await new User(userData).save();

/**
 * @param {String} id
 * @param {Object} userData
 * @param {string} userData.phone
 * @param {string} userData.email
 * @param {string} userData.username
 * @param {Array} userData.openBets
 * @param {Array} userData.closedBets
 * @param {Boolean} userData.confirmed
 * @param {Boolean} userData.admin
 * @param {Date} userData.date
 * @param {String} userData.password
 * @param {String} userData.passwordResetToken
 */
const updateUser = async (userData) => await User.findOneAndUpdate({
  _id: userData.id,
}, userData, { new: true }).exec();

/** @param {String} userId */
const getOne = (userId) => User.findOne({ _id: userId }).exec();

/** @param {String} IdEmailPhoneOrUsername */
const getUserByIdEmailPhoneOrUsername = (IdEmailPhoneOrUsername) => User
  .findOne({
    $or: [
      { username: IdEmailPhoneOrUsername },
      { phone: IdEmailPhoneOrUsername },
      { email: IdEmailPhoneOrUsername },
    ],
  })
  .exec();

const verifyEmail = async (email) => {
  return await User.findOneAndUpdate(
    { email },
    { $set: { confirmed: true } },
    { new: true }
  ).exec();
};

const getUserEntriesAmount = async () => User.countDocuments({}).exec();

module.exports = {
  createUser,
  updateUser,
  getOne,
  getUserByIdEmailPhoneOrUsername,
  verifyEmail,
  getUserEntriesAmount,
};
