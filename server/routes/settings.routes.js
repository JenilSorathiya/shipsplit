const router   = require('express').Router();
const ctrl     = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const v        = require('../validations/settings.validation');

router.use(authenticate);

router.get('/', ctrl.getSettings);

router.put('/label-defaults',  validate(v.updateLabelDefaults),  ctrl.updateLabelDefaults);
router.put('/notifications',   validate(v.updateNotifications),  ctrl.updateNotifications);

router.get('/couriers',        ctrl.getCouriers);
router.post('/couriers',       validate(v.addCourier),    ctrl.addCourier);
router.put('/couriers/:id',    validate(v.updateCourier), ctrl.updateCourier);
router.delete('/couriers/:id',                            ctrl.removeCourier);

module.exports = router;
