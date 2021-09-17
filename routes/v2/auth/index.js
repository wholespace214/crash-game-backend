const router = require('express').Router();

const publicAuthRoutes = require('./public-auth-routes');

router.use(publicAuthRoutes);

module.exports = router;
