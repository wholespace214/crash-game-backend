// Import the express Router to create routes
const router = require('express').Router();
const { check } = require('express-validator');
const userController = require('../../controllers/users-controller');

router.get('/getLeaderboard/:skip/:limit', userController.getLeaderboard);

router.get(
  '/confirm-email',
  [check('userId').isString(), check('code').isLength({ min: 6, max: 6 })],
  userController.confirmEmail
);

router.get('/:userId/info', userController.getBasicUserInfo);

router.get('/:userId/stats', userController.getUserStats);

module.exports = router;
