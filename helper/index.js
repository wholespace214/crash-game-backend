exports.isAdmin = (req) => !(req.user.admin === false && req.params.userId !== req.user.id);
