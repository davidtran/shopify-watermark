var shopifyAPI = require('shopify-node-api');
var models = require('../models');

module.exports = {
  getApi: getApi
}

function getApi(shopname) {
  var shopname = shopname.split('.')[0];
  return models
    .Shop
    .find({where: {
      shop: shopname
    }})
    .then(shop => {
      if (!shop) {
        shop = models.Shop.build({
          shop: shopname,
          nonce: generateNonce(),
          isInstalled: false
        });
      }
      return shop.save();
    })
    .then(shop => {
      return new shopifyAPI({
        shop: shopname,
        shopify_api_key: process.env.SHOPIFY_API_KEY,
        shopify_shared_secret: process.env.SHOPIFY_SECRET,
        shopify_scope: process.env.SHOPIFY_SCOPE,
        redirect_uri: process.env.HOST_NAME + '/install/callback',
        nonce: shop.nonce,
        access_token: shop.token
      });
    });
}

function generateNonce() {
  return new Date().getTime();
}

