const User = require('../models/User.model');

exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'phone', 'gstin', 'businessName'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (updates.gstin) updates.gstin = updates.gstin.toUpperCase();

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user: user.toSafeObject() });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) return res.status(400).json({ message: 'Account uses Google login — no password set' });

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};
