var base64 = require('node-base64-image');
var Promise = require('bluebird');
var fs = require('fs');

function convertImageTo64(path, deleteAfterConvert) {
  return new Promise((resolve, reject) => {
    deleteAfterConvert = deleteAfterConvert || false;
    var options = {localFile: true, string: true};

    return base64.base64encoder(path, options, (err, image) => {
      if (err) return reject(err);
      if (false == deleteAfterConvert) {
        return resolve(image);
      } else {
        return fs.unlink(path, function(err) {
          if (err) return reject(err);
          return resolve(image);
        });
      }

    });
  });
}

function image64FromUrl(url) {
  return new Promise((resolve, reject) => {
    var options = {string: true};
    return base64.base64encoder(url, options,  (err, image) => {
      if (err) return reject(err);
      return resolve(image);
    });
  })

}

module.exports.convertImageTo64 = convertImageTo64;
module.exports.image64FromUrl = image64FromUrl;
