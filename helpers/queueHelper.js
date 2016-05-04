var kue = require('kue'),
    queue = kue.createQueue(),
    Promise = require('bluebird')

function createWatermarkJob(image, delay) {
  return new Promise((resolve, reject) => {

    var shopifyProductId, shopName;
    return image.getProduct()
      .then(product => {
        shopifyProductId = product.productId;
        return image.getShop();
      })
      .then(shop => {
        return queue
          .create('watermark', {
            imageId: image.id,
            shopId: shop.id,
            shopName: shop.name,
            shopifyImageId: image.imageId,
            shopifyProductId: shopifyProductId
          })
          .delay(delay)
          .attempts(2)
          .backoff({
            delay: 60000,
            type: 'fixed'
          })
          .ttl(60000)
          .save((err) => {
            if (err) return reject(err);
            return resolve();
          })
      })
  })
}

function removeWatermark(imageId, delay) {
  return new Promise((resolve, reject) => {
    return queue.create('removeWatermark', {
      imageId: imageId
    })
    .delay(delay)
    .attempts(3)
    .backoff({
      delay: 60000,
      type: 'fixed'
    })
    .ttl(30000)
    .save((err) => {
      if (err) return reject(err);
      return resolve();
    });
  })

}

module.exports = {
  createWatermarkJob: createWatermarkJob,
  removeWatermark: removeWatermark
}