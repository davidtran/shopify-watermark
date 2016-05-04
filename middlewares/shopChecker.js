var models = require('../models');

function shop(req, res, next) {
  if (!req.session.shop) return res.redirect('install/login');
  return models
    .Shop
    .find({
      shop: req.session.shop
    })
    .then(shop => {
      req.data = req.data || {}
      req.data.shop = shop;
      next();
    }, err => res.render('500'));
}

module.exports = shop;