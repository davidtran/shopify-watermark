var express = require('express')
var router = express.Router()
var models = require('../models')
var Promise = require('bluebird')
var shopifyImageHelper = require('../helpers/shopifyImageHelper');
var queueHelper = require('../helpers/queueHelper.js')

module.exports = router

process.on("unhandledRejection", function(reason, promise) {
    console.log(reason, promise);
});

process.on("rejectionHandled", function(promise) {
    console.log(promise);
});

router.post('/:shopId/product/create', (req, res) => {
  return createOrUpdateProduct(req.params.shopId, req.body)
    .then(() => res.sendStatus(200))
    .catch(err => res.status(500).send(err.message));
});

router.post('/:shopId/product/update', (req, res) => {
  return createOrUpdateProduct(req.params.shopId, req.body)
    .then(() => res.sendStatus(200))
    .catch(err => {
      console.log(err);
      res.status(500).send(err.message)
    });
});

router.post('/:shopId/product/delete', (req, res) => {
  return deleteProduct(req.params.shopId, req.body.id)
    .then(() => res.sendStatus(200))
    .catch(err => res.status(500).send(err.message))
});

function deleteProduct(shopId, productId) {
  return models.Product.destroy({
    where: {
      productId: productId
    }
  });
}

function createOrUpdateProduct(shopId, productData) {
  console.log(productData);
  return new Promise((resolve, reject) => {
    var shopModel;
    return models
      .Shop
      .findById(shopId)
      .then(shop => {
        if (!shop) return reject(new Error('invalid shop id'))
        shopModel = shop;
        return models
          .Product
          .find({
            where: {
              productId: productData.id
            }
          });
      })
      .then(product => {
        if (!product) {
          product = models.Product.build({
            productId: productData.id,
            name: productData.title,
            ShopId: shopModel.id
          })
        } else {
          product.name = productData.title
        }

        if (productData.image) {
          product.featuredImage = productData.image.src;
        }

        return product.save();
      })
      .then(product => {
        var pms = [];
        console.log(productData);
        productData.images.forEach(image => pms.push(saveImage(shopModel, product, image)))
        return Promise.all(pms);
      })
      .then(() => resolve())
      .catch(err => {
        reject(err)
      })
  })

}

function saveImage(shop, product, imageData) {
  return new Promise((resolve, reject) => {
    var isNewImage = false;
    return models
      .ProductImage
      .find({
        where: {
          imageId: imageData.id
        }
      })
      .then(image => {
        if (!image) {
          image = models.ProductImage.build({
            imageId: imageData.id,
            ProductId: product.id,
            ShopId: shop.id,
            originalBase64: null,
            src: imageData.src,
            isWatermarked: false,
            position: imageData.position
          });
          isNewImage = true;
        }
        return image.save();
      })
      .then((image) => {
        if (isNewImage && shop.autoWatermark) {
          return queueHelper.createWatermarkJob(image, 0);
        } else {
          return resolve();
        }
      })
      .then(() => resolve())
      .catch(err => {
        console.log(err);
        return reject(err)
      });

  });
}