const logger = require("../util/logger")
const userApi = require("../apis/user-api")

module.exports = {
  async createUser(req, res) {
try {
  const {phone,username,password,email}=req.body
  const createdUser = await userApi.createUser({
    // Phone is currently required by backend
    phone,
    email,
    username,
    openBeds:[],
    closedBets:[],
    confirmed:false,
    admin:false,
    date:new Date(),
    password,
  });

if(!createdUser) throw new Error("Couldn't create user")
  return res.status(200).json(createdUser);
} catch (err) {
  logger.error(err)
}
return res.status(500).send()

  },

  async verifyEmail(req, res) {
    try {
      const user = await userApi.verifyEmail(req.body.email);
if(!user) throw new Error("Couldn't verify email. EMail not found")
  return res.status(200).json(user);

    } catch (err) {
      logger.error(err)
    }
return res.status(500).send()
  },

  async getAll(req, res) {
    return res.status(200).json(fakeDb);
  },
};
