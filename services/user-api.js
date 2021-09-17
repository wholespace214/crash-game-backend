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
 * @param {String} userData.password
 */
const createUser=(userData)=>User.save(userData)

/**
 * @param {String} id
 * @param {Object} userData
 * @param {string} userData.phone
 * @param {string} userData.email
 * @param {username} userData.username
 * @param {Array} userData.openBets
 * @param {Array} userData.closedBets
 * @param {Boolean} userData.confirmed
 * @param {Boolean} userData.admin
 * @param {Date} userData.date
 * @param {String} userData.password
 */
const updateUser=(userData)=>User.save(userData)

/** @param {String} userId */
const getOne=(userId)=>User.findOne({_id:userId}).exec();

/** @param {String} IdEmailPhoneOrUsername */
const getUserByIdEmailPhoneOrUsername=(IdEmailPhoneOrUsername)=>User.findOne({$or: [
  { _id: IdEmailPhoneOrUsername },
  { username: IdEmailPhoneOrUsername },
  { phone: IdEmailPhoneOrUsername },
  { email: IdEmailPhoneOrUsername },
],}).exec();

const verifyEmail =async (email)=>{
  return  User.findOneAndUpdate(
        { email },
        { $set: { confirmed: true} },
        { new: true },
      ).exec();
}

module.exports = {
  createUser,
  updateUser,
getOne,
getUserByIdEmailPhoneOrUsername,
verifyEmail,
};
