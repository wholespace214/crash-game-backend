exports.isAdmin = (req) => req.user.admin === true && req.params.userId === req.user.id;
