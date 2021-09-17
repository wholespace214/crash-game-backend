// const passport = require('passport');
const router = require('express').Router();

const publicUserRoutes = require('./public-user-routes');
const protectedUserRoutes = require('./protected-user-routes');

router.use(publicUserRoutes);
/*
 * TODO make these routes protected.
 * @gmussi We'll need to discuss how everything in the Frontend should be handled first
 */
// router.use(passport.authenticate('jwt', { session: false }), protectedUserRoutes);
router.use(protectedUserRoutes);

module.exports = router;
