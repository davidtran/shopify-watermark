var Promise = require('bluebird');
var models = require('../models');
var base64Helper = require('./base64Image.js');

module.exports = ShopifyImageHelper;

function downloadRemoteImage(image) {

}

function ShopifyImageHelper(api) {
  this.api = api;
}

ShopifyImageHelper.prototype.getAllImages = function() {
  var _this = this;
  console.log(_this);
  return new Promise((resolve, reject) => {
    return _this.getShopifyProducts()
      .then(products => {
        console.log(products);
        var promises = [];
        products.forEach(product => {
          promises.push(_this.getProductImages(product));
        });
        return Promise.all(promises);
      })
      .then(imageCollections => {
        var result = [];
        imageCollections.forEach(images => {
          images.forEach(image => result.push(image));
        });
        return resolve(result);
      })
      .error(err => reject(err));
  });
}

ShopifyImageHelper.prototype.getShopifyProducts = function() {
  var _this = this;
  return new Promise((resolve, reject) => {
    return _this.api.get('/admin/products.json?fields=id', (err, data) => {
      if (err) return reject(err);
      if (!data.products) return reject(new Error('Missing products field in response'));
      return resolve(data.products);
    });
  });
}

ShopifyImageHelper.prototype.getProductImages = function(product) {
  var _this = this;
  return new Promise((resolve, reject) => {
    var url = '/admin/products/' + product.id + '/images.json';
    return _this.api.get(url, (err, data) => {
      if (err) return reject(err);
      if (!data.images) return reject(new Error('Missing images field in response'));
      return resolve(data.images);
    });
  });
}

ShopifyImageHelper.prototype.saveShopImage = function(images) {
  var _this = this;
  var shopname = _this.api.config.shop;
  return new Promise(resolve, reject => {
    models
      .Shop
      .find({
        where: {
          shop: shopname
        }
      })
      .then(shop => {
        if (!shop) {
          return reject(new Error('Shop is not available'));
        }
        return _this.saveImages(shop, images);
      })
      .then(() => resolve())
      .error(err => reject(err));
  });

}

ShopifyImageHelper.prototype.saveImages = function(shop, images) {
  function storeImage(image) {
    return new Promise((resolve, reject) => {
      var sql = 'INSERT IGNORE ProductImages(imageId, productId, position, src, originalBase64, isWatermarked, isRestored, ShopId) ' +
                'VALUES(:imageId, :productId, :position, :src, :originalBase64, :isWatermarked, :isRestored, :ShopId)';
      return models.sequelize.query(sql, {
        replacements: {
          imageId: image.id,
          productId: image.product_id,
          position: image.position,
          src: image.src,
          originalBase64: null,
          isWatermarked: false,
          isRestored: false,
          ShopId: shop.id
        }
      }).spread((result, metaData) => {
        return resolve();
      }, err => reject(err));
    });
  }
  var pms = [];
  console.log(images);
  images.forEach(image => pms.push(storeImage(image)));
  return Promise.all(pms);
}

function filterWatermarkImages(products, images) {
  return new Promise((resolve, reject) => {
    var existingImages = images.map(image => image.id);
    models.ProductImage.findAll({
      where: {
        imageId: {
          $in: existingImages
        }
      }
    })
    .then(filterImages => {
      var filterImageIds = filterImages.map(image => image.imageId);
      images = images.filter(image => filterImages.indexOf(image.id) == false);
      return resolve(images);
    })
    .error(err => reject(err));
  });
}