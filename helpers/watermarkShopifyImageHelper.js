var shopifyApi = require('../helpers/shopifyApi.js');
var models = require('../models');
var Promise = require('bluebird');
var watermarkHelper = require('../helpers/watermarkHelper.js');
var fs = require('fs');
var request = require('request');
var base64Image = require('../helpers/base64Image.js');
var shopifyApiHelper = require('../helpers/shopifyApi.js');
var imageHelper = require('../helpers/imageHelper.js');
module.exports.processImage = processImage;

process.on("unhandledRejection", function(reason, promise) {
    console.log(reason, promise);
});

// NOTE: event name is camelCase as per node convention
process.on("rejectionHandled", function(promise) {
  console.log(promise);
    // See Promise.onUnhandledRejectionHandled for parameter documentation
});

function processImage(image) {

  return new Promise((resolve, reject) => {
    var filename = null;
    var base64Image = null;
    var watermarkedFile;
    return imageHelper.getImagePath(image)
      .then((pfilename) => {
        filename = pfilename;
        return getWatermarkConfig(image);
      })
      .then(watermarkConfig => {
        console.log(watermarkConfig.toJSON())
        return watermarkHelper.createTextWatermark(filename,
                                                  watermarkConfig.text,
                                                  watermarkConfig.fontSize,
                                                  watermarkConfig.position,
                                                  watermarkConfig.textColor,
                                                  watermarkConfig.fontName,
                                                  watermarkConfig.opacity,
                                                  watermarkConfig.backgroundTextColor);
      })
      .then(resultWatermarkedFile => {
        watermarkedFile = resultWatermarkedFile;
        return image.getProduct();
      })
      .then(product => {
        return updateProductImage(image, product, watermarkedFile);
      })
      .then(data => {
        console.log(data);
        return fs.unlink(filename, () => {
          image.isWatermarked = true;
          image.src = data.image.src;
          return image.save();
        });
      })
      .then(() => resolve())
      .catch(err => {
        console.log(err);
      })
  })

}

function convertBase64ImageToFile(base64Image, filename) {
  return new Promise((resolve, reject) => {
    var imageData = new Buffer(base64Image, 'base64');
    return fs.writeFile(filename, imageData, {encoding: 'base64'}, (err) => {
      if (err) return reject(err);
      return resolve();
    })
  });
}


function updateProductImage(image, product, watermarkedFile) {

  return new Promise((resolve, reject) => {
    return base64Image
      .convertImageTo64(watermarkedFile, true)
      .then(base64 => {
        return getApiByShopId(image.ShopId)
          .then(api => {
            api.put('/admin/products/' + product.productId + '/images/' + image.imageId + '.json', {
              image: {
                attachment: base64,
                watermarkedFile: image.imageId.toString() + '.png'
              }
            }, (err, data) => {
              if (err) return reject(err);
              return resolve(data);
            })
          });
      });
  })

}

function getApiByShopId(shopId) {
  return models
    .Shop
    .find({
      where: {
       id: shopId
      }
    })
    .then(shop => {
      return shopifyApiHelper.getApi(shop.shop);
    });
}

function getWatermarkConfig(image) {
  return new Promise((resolve, reject) => {
    return models
      .WatermarkConfig
      .find({
        where: {
          ShopId: image.ShopId
        }
      })
      .then(watermarkConfig => {
        if (!watermarkConfig) return reject(new Error('Can not found watermarkConfig'));
        return resolve(watermarkConfig);
      })
      .error(err => reject(err));
  });
}

