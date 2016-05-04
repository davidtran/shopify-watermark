var express = require('express');
var router = express.Router();
var models = require('../models');
var shopChecker = require('../middlewares/shopChecker.js');
module.exports = router;

router.get('/', shopChecker, (req, res) => {
  var products = [];
  return models
    .Product
    .findAll({
      where: {
        ShopId: req.data.shop.id
      }
    })
    .then(productModels => {
      products = productModels
      var pms = [];
      products.forEach(product => {
        pms.push(function() {
          return product
            .getImages()
            .then(images => {
              product.images = images;
              product.unwatermarkedCount = 0;
              images.forEach(image => {
                if (image.isWatermarked == false) product.unwatermarkedCount++;
              })
            })
        })
      })
      return Promise.all(pms)
    })
    .then(() => {
      return res.render('product/index', {
        products: products
      })
    })
    .catch(error => res.render('product/index', {
      error: error
    }))
})

router.get('/:productId', (req, res) => {
  var productModel;
  return models
    .Product
    .findOne({
      where: {
        id: req.params.productId
      }
    })
    .then(product => {
      console.log(product.toJSON())
      productModel = product;
      return models.ProductImage.findAll({
        where: {
          ProductId: req.params.productId
        }
      })
    })
    .then(images => {
      return res.render('product/detail', {
        product: productModel,
        images: images
      })
    })
    .catch(error => {
      console.log(error);
      res.render('500', {
        error: error
      })
    });

})