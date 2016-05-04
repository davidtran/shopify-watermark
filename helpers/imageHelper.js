var fs = require('fs');
var Promise = require('bluebird');
var request = require('request');

module.exports.getImagePath = getImage;

function getImage(image) {
  var ext = getRemoteFileExtension(image.src);
  //original version
  var filename = __dirname + '/../public/img/original/' + image.imageId.toString() + '.' + ext;

  //for processing
  var returnFilename = __dirname + '/../public/img/downloaded/' + image.imageId.toString() + '.' + ext;

  return new Promise((resolve, reject) => {
    return downloadImage(image, filename)
      .then(() => {
        return cloneImage(filename, returnFilename)
      })
      .then(() => resolve(returnFilename))
      .catch(err => reject(err));
  })
}


function getRemoteFileExtension(source) {
  var questionIndex = source.lastIndexOf('?');
  var dotIndex = source.lastIndexOf('.');
  return source.substr(dotIndex + 1, questionIndex - dotIndex -1);
}

function cloneImage(original, clonePath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(original)
      .pipe(fs.createWriteStream(clonePath))
      .on('close', () => {
        return resolve()
      })
      .on('error', err => reject(err));
  })
}

function downloadImage(image, filename) {

  return new Promise((resolve, reject) => {
    if (image.isDownloaded) {
      return resolve();
    } else {
      return request.head(image.src, function(err, res, body){
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);
        return request(image.src)
          .pipe(fs.createWriteStream(filename))
          .on('close', () => {
            image.isDownloaded = true;
            return image.save()
              .then(() => resolve())
              .error(err => reject(err));
          })
          .on('error', (err) => reject(err))
      });
    }

  })

}