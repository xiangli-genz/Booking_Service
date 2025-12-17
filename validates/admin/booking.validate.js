const Joi = require('joi');

module.exports.editPatch = (req, res, next) => {
  const schema = Joi.object({
    paymentStatus: Joi.string().valid('paid', 'unpaid').required(),
    status: Joi.string().valid('initial', 'confirmed', 'cancelled', 'completed').required(),
    note: Joi.string().allow('').optional()
  });

  const { error } = schema.validate(req.body);

  if(error) {
    return res.json({
      code: "error",
      message: error.details[0].message
    });
  }
  
  next();
};