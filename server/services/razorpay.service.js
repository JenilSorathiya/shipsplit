const Razorpay = require('razorpay');

let instance;

const getRazorpay = () => {
  if (!instance) {
    instance = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return instance;
};

exports.createOrder = async (amountInPaise, currency = 'INR') => {
  const rz = getRazorpay();
  return rz.orders.create({
    amount: amountInPaise,
    currency,
    receipt: `rcpt_${Date.now()}`,
  });
};

exports.fetchPayment = async (paymentId) => {
  return getRazorpay().payments.fetch(paymentId);
};

exports.refundPayment = async (paymentId, amountInPaise) => {
  return getRazorpay().payments.refund(paymentId, { amount: amountInPaise });
};
