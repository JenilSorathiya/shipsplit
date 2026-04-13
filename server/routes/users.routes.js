const router = require('express').Router();
const { body } = require('express-validator');
const usersController = require('../controllers/users.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');

router.use(authenticate);

router.patch('/profile',
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Invalid mobile number'),
    body('gstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i),
    body('businessName').optional().trim().isLength({ max: 100 }),
  ],
  validate,
  usersController.updateProfile
);

router.post('/change-password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  ],
  validate,
  usersController.changePassword
);

module.exports = router;
