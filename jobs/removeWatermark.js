var Promise = require('bluebird');
var models = require('../models');
var base64Image = require('../helpers/base64Image');
var shopifyApi = require('../helpers/shopifyApi.js');
module.exports = removeWatermark;

function removeWatermark(job, ctx, done) {
  var api, shopModel, productModel, imageModel;

    return models
      .ProductImage
      .findById(job.data.imageId)
      .then(image => {
        if (!image) return done(new Error('image not found'));
        if (!image.isWatermarked || !image.isDownloaded) return done(new Error('This image is not watermarked yet'));
        imageModel = image;
        return imageModel.getShop();
      })
      .then(shop => {
        shopModel = shop;
        return imageModel.getProduct()
      })
      .then(product => {
        productModel = product;
        return shopifyApi.getApi(shopModel.shop)
      })
      .then(apiObj => {
        api = apiObj;
        return new Promise((resolve, reject) => {
          return api.get('/admin/products/' + productModel.productId + '/images/' + imageModel.imageId + '.json', (err, data) => {
            if (err) return reject(err);
            if (!data.image) return reject(new Error('Missing image data from api response'));
            return resolve(data);
          });
        })

      })
      .then(imageData => {
        if (!imageData.image) {
          imageModel.destroy();
          return done(new Error('Image not found on server'))
        } else if (imageData.image.src != imageModel.src) {
          return done(new Error('Image on shop has been changed'));
        } else {
          return revertImage(api, productModel, imageModel);
        }
      })
      .then((apiData) => {
        imageModel.isWatermarked = false;
        imageModel.src = apiData.image.src;
        imageModel.save();
      })
      .then(() =>  done())
      .catch(err =>  done(err))

}

function revertImage(api, product, image) {
  return new Promise((resolve, reject) => {
    if (image.isDownloaded) {
      var ext = getRemoteFileExtension(image.src);
      var filename = __dirname + '/../public/img/original/' + image.imageId.toString() + '.' + ext;
      return base64Image.convertImageTo64(filename)
        .then(base64 => {
          return api.put('/admin/products/' + product.productId + '/images/' + image.imageId + '.json', {
            image: {
              attachment: base64,
              watermarkedFile: image.imageId.toString() + '.png'
            }
          }, (err, data) => {
            if (err) return reject(err);
            if (!data.image) return reject(new Error('Api error'));
            return resolve(data);
          });
        });
    } else {
      return reject(new Error('Image is not downloaded'));
    }

  })


}

function getRemoteFileExtension(url) {
  var urlArray = url.split('.');
  var ext = urlArray[urlArray.length - 1];
  var questionMark = ext.indexOf('?');
  ext = ext.substr(0, questionMark);
  return ext;
}