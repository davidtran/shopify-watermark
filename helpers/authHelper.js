var util = require('util');
var Promise = require('bluebird');
var crypto = require('crypto');
var request = require('request-promise');
var models = require('../models');

module.exports = {
  isShopInstalled: isShopInstalled
};

function isShopInstalled(query) {
  var _this = this;

  return new Promise((resolve, reject) => {
    if (!query) return reject(new Error('Invalid login params'));
    var shopName = query.shop.split('.')[0];
    var shop = null;
    return models
      .Shop
      .findOne({
        where: {
          shop: shopName
        }
      })
      .then((shopData) => {
        shop = shopData;
        if (!shop || !shop.isInstalled) return resolve(false);
        return resolve(true);
      })
      .catch(err => reject(err));
  })

}
