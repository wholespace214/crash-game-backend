const fakeDb = [];

module.exports = {
  async createUser(req, res, next) {
    const l = fakeDb.push(req.body.userData);
    return res.status(200).json(fakeDb[l - 1]);
  },
  async getSelf() {
    return res.status(200).json(fakeDb[0]);
  },
  async getAll(req, res, next) {
    return res.status(200).json(fakeDb);
  },
};
