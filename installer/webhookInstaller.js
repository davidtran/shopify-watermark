var Promise = require('bluebird');

module.exports = WebhookInstaller;

function WebhookInstaller(api, shopModel) {
  this.api = api;
  this.shopModel = shopModel;
}

WebhookInstaller.prototype.install = function() {
  return this.installProductWebhook();
}

WebhookInstaller.prototype.installProductWebhook = function() {
  var _this = this;
  var productWebhooks = [
    {
      topic: 'products/create',
      address: process.env.TUNNEL + '/webhooks/' + _this.shopModel.id + '/product/create',
      format: 'json'
    },
    {
      topic: 'products/update',
      address: process.env.TUNNEL + '/webhooks/' + _this.shopModel.id + '/product/update',
      format: 'json'
    },
    {
      topic: 'products/delete',
      address: process.env.TUNNEL + '/webhooks/' + _this.shopModel.id + '/product/delete',
      format: 'json'
    }
  ]
  var _this = this;
  var pms = [];
  productWebhooks.forEach(hook => pms.push(_this.installHook(hook)));
  return Promise.all(pms);
}

WebhookInstaller.prototype.installHook = function(hookData) {
  var _this = this;
  return new Promise((resolve, reject) => {
    return _this.api.post('/admin/webhooks.json', {
      webhook: hookData
    }, (err, data) => {
      if (err) return reject(err);
      console.log('Webhook installed:', data);
      return resolve();
    })
  })
}
