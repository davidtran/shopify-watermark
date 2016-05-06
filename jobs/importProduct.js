var models = require('../models');
var Promise = require('bluebird');
var shopifyApi = require('../helpers/shopifyApi');

module.exports = function(job, ctx, done) {
  console.log(job);
  return new ProductImporter(job.data.shopId)
    .import()
    .then(() => done())
    .catch(err => done(err))
}

function ProductImporter(shopId) {
  this.shopId = shopId;
}

ProductImporter.prototype.import = function() {
  var _this = this;
  return _this.getShopModel(_this.shopId)
    .then(shop => {
      return shopifyApi.getApi(_this.shop.shop);
    })
    .then(api => {
      _this.api = api;
      return _this.removeOldProduct();
    })
    .then(() => {
      return _this.getProducts()
    })
    .then(products => {
      return _this.saveProducts(products);
    });
}

ProductImporter.prototype.removeOldProduct = function() {
  var _this = this;
  return models.Product.destroy({
    where: {
      ShopId: _this.shop.id
    }
  })
}

ProductImporter.prototype.getShopModel = function() {
  var _this = this;
  return new Promise((resolve, reject) => {
    return models
      .Shop
      .find({
        where: {
          id: _this.shopId
        }
      })
      .then(shop => {
        if (!shop) return reject(new Error('shop not found'));
        _this.shop = shop;
        return resolve();
      })
  })

}

ProductImporter.prototype.getProducts = function() {
  var _this = this;
  return new Promise((resolve, reject) => {
    return _this.api.get('/admin/products.json?fields=id,title,images,image', (err, data) => {
      if (err) return reject(err);
      if (!data.products) return reject(new Error('Missing products field in response'));
      return resolve(data.products);
    });
  });
}

ProductImporter.prototype.saveProducts = function(products) {
  var _this = this;
  function saveProduct(product) {
    var data = {
      productId: product.id,
      name: product.title,
      ShopId: _this.shop.id,
      featuredImage: product.image.src
    }
    var images = product.images;
    return models.Product.build(data).save()
      .then(pProduct => {
        var imagePromises = [];
        images.forEach(image => {
          imagePromises.push(saveProductImage(pProduct, image));
        })
        return Promise.all(imagePromises);
      });
  }

  function saveProductImage(product, image) {
    var data = {
      imageId: image.id,
      src: image.src,
      originalBase64: null,
      version: getImageVersion(image.src),
      isWatermarked: false,
      position: image.position,
      ShopId: _this.shop.id,
      ProductId: product.id
    }
    return models.ProductImage.build(data).save();
  }

  var productPromises = [];
  products.forEach(product => {
    productPromises.push(saveProduct(product));
  });
  return Promise.all(productPromises);
}

function getImageVersion(imageUrl) {
  var startPoint = imageUrl.indexOf('=');
  return imageUrl.substr(startPoint + 1);
}