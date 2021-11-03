const router = require('express').Router();
const { check } = require('express-validator');
const { validateRequest } = require('../../util/request-validator');
const controller = require('../../controllers/user-messages-controller');

router.get('/', controller.getMessagesByUser);

router.put('/:id/read', [check('id').isMongoId()], validateRequest(controller.setMessageRead));

router.post(
  '/',
  [check('userId').exists(), check('userId'.isMongoId)],
  validateRequest(controller.sendMessage)
);

module.exports = router;
