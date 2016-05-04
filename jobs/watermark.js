var kue = require('kue');
var queue = kue.createQueue();
var Promise = require('bluebird');
var shopifyApi = require('../helpers/shopifyApi');
var models = require('../models');
var watermarkHelper = require('../helpers/watermarkHelper.js');
var watermarkShopifyImageHelper = require('../helpers/watermarkShopifyImageHelper.js');

module.exports = process;

function process(job, ctx, done) {
  var api, shopModel, shopifyImage;
  console.log(job.data);

  return models
    .Shop
    .findById(job.data.shopId)
    .then(shop => {
      console.log(shop.toJSON());
      if (!shop) return done(new Error('Invalid shop id'));

      shopModel = shop;
      return shopifyApi
        .getApi(shopModel.shop)
    })
    .then(resultApi => {
      api = resultApi;
      return fetchImage(api, job.data.shopifyProductId, job.data.shopifyImageId);
    })
    .then(apiData => {
      console.log(apiData);
      shopifyImage = apiData.image;
      return models.ProductImage.find({
        where: {
          id: job.data.imageId
        }
      })
    })
    .then(image => {
      if (!image) return done(new Error('Image is not exist in db'));
      if (image.src != shopifyImage.src && image.isWatermarked) return done(new Error('Image src is different:' + image.src + ':' + shopifyImage.src));
      return watermarkShopifyImageHelper.processImage(image);
    })
    .then(() => done())
    .catch(err => {
      console.log(err);
      done(err)
    });


}

function fetchImage(api, shopifyProductId, shopifyImageId) {
  return new Promise((resolve, reject) => {
    return api.get('/admin/products/' + shopifyProductId + '/images/' + shopifyImageId + '.json', (err, data) =>{
      if (err) return reject(err);
      if (!data.image) return reject(new Error('image not found'));
      return resolve(data);
    });
  })
}