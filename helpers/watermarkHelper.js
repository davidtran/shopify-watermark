var gm = require('gm');
var jimp = require('jimp');
var fs = require('fs');
var util = require('util');

module.exports = {
  createTextWatermark: createTextWatermark,
  createImageWatermark: createImageWatermark
}

function drawText(text, fontSize, textColor, fontName, opacity, backgroundColor, outfile) {
  return createTextImage(text, fontSize, textColor, fontName, backgroundColor, outfile)
    .then(() => {
      return trimImage(outfile);
    })
    .then(() => {
      return setFade(outfile, opacity);
    });
}

function setFade(filename, opacity) {
  return new Promise((resolve, reject) => {
    var fade = parseInt(opacity);
    fade = 100 - fade;
    fade = fade / 100;
    return jimp.read(filename, (err, image) => {
      if (err) return reject(err);
      return image.fade(fade)
        .write(filename, (err) => {
          if (err) return reject(err);
          return resolve();
        })
    });
  })
}

function createTextImage(text, fontSize, textColor, fontName, backgroundColor, outfile) {
  return new Promise((resolve, reject) => {
    return gm(900, 900, 'transparent')
      .gravity('Center')
      .fill(textColor)
      .fontSize(fontSize)
      .drawText(0, 0, text)
      .write(outfile, (err) => {
        if (err) return reject(err);
        return resolve();
      });
  });
}



function trimImage(filename) {
  return new Promise((resolve, reject) => {
    return gm(filename)
      .trim()
      .write(filename, (err) => {
        if (err) return reject(err);
        return resolve();
      });
  });
}

function imageOffset(backgroundColor, filename, offset) {

  return new Promise((resolve, reject) => {
    return gm(filename)
      .size((err, size) => {
        if (err) return reject(err);
        var width = size.width + offset;
        var height = size.height + offset;
        var padding = Math.round(offset / 2);
        var image = 'image over ' + padding + ',' + padding + ' 0,0 "' + filename + '"';
        return gm(width, height, 'gray')
          .channel('rgba')
          .matte()
          .fuzz('40%')
          .fill('rgba(255,255,255,0.5)')
          .background('rgba(255,255,255)')
          .draw([image])
          .write(filename, (err) => {
            if (err) return reject(err);
            return resolve();
          });
      });
  });
}


function getTextImage(text, fontSize, textColor, fontName, opacity, backgroundColor) {
  return new Promise((resolve, reject) => {
    var name = util.format('%s_%s_%s_%s_%s_%s.png',text, fontSize, textColor, fontName, opacity.toString(), backgroundColor);
    var filename = __dirname + '/../public/img/text/' + name;
    fs.exists(filename, function(exists) {
      if (exists) {
        return resolve(filename);
      } else {
        return drawText(text, fontSize, textColor, fontName, opacity, backgroundColor, filename)
          .then(() => resolve(filename))
          .catch(err => reject(err));
      }
    })
  })
}

function updateWatermarkImage(imagePath, imageSize, opacity, backgroundColor) {
  return new Promise((resolve, reject) => {
    var tempFile = __dirname + '/../public/img/' + new Date().getTime() + '-watermark.png';
    return jimp.read(imagePath, (err, data) => {
      if (err) return reject(err);
      var scale = parseInt(imageSize) / 100;
      var fade = parseInt(opacity);
      fade = 100 - fade;
      fade = fade / 100;
      return data
        .scale(scale)
        .fade(fade)
        .write(tempFile, (err) => {
          if (err) return reject(err);
          return resolve(tempFile);
        })
    })

  })

}

function createImageWatermark(file,
                              watermarkFile,
                              imageSize,
                              position,
                              opacity,
                              backgroundColor) {
  console.log(arguments);
  return new Promise((resolve, reject) => {
    var shortName = new Date().getTime().toString() + '.png';
    var fullName = __dirname + '/../public/img/' + shortName;
    return updateWatermarkImage(watermarkFile, imageSize, opacity, backgroundColor)
      .then(tempFile => {
        return getTextWatermarkPosition(file, tempFile, position)
          .then(position => {
            var watermarkOperator = 'image over ' + position.x + ',' + position.y + ' 0,0 ' + '"' + tempFile + '"';
          return gm(file)
            .draw([watermarkOperator])
            .write(fullName, (err) => {
              if (err) return reject(err);
              return resolve(fullName);
            });
          });
      });
  });

}

function createTextWatermark(imagePath,
                             text,
                             fontSize,
                             textPosition,
                             textColor,
                             fontName,
                             opacity,
                             backgroundColor) {
  var shortName = new Date().getTime().toString() + '.png';
  console.log(arguments);
  var fullName = __dirname + '/../public/img/' + shortName;
  var textImagePath;
  return new Promise((resolve, reject) => {
    return getTextImage(text, fontSize, textColor, fontName, opacity, backgroundColor)
      .then((textImagePathResult) => {
        textImagePath = textImagePathResult;
        return getTextWatermarkPosition(imagePath, textImagePath, textPosition);
      })
      .then((position) => {
        var watermarkOperator = 'image over ' + position.x + ',' + position.y + ' 0,0 ' + '"' + textImagePath + '"';
        return gm(imagePath)
          .draw([watermarkOperator])
          .write(fullName, (err) => {
            if (err) return reject(err);
            //var previewUrl = '/img/' + shortName;
            return resolve(fullName);
          });
      })
      .catch(err => reject(err));
  });
}

function createTextWatermarkFromBase64Image(base64Image, text, fontSize, textPosition, textColor, backgroundColor) {
  var img = new Buffer(base64Image, 'base64');
}

function getTextWatermarkPosition(image, textImage, position) {
  var x, y;
  var imageSize, textSize;
  return new Promise(function(resolve, reject) {
    return getImageSize(image)
      .then(function(size) {
        imageSize = size;
        return getImageSize(textImage);
      })
      .then(function(size) {
        textSize = size;
        switch(position) {
          case 'top-left':
            x = 5;
            y = 5;
            break;
          case 'top':
            x = Math.round((imageSize.width - textSize.width) / 2);
            y = 5;
            break;
          case 'top-right':
            x = imageSize.width - textSize.width - 5;
            y = 5;
            break;
          case 'left':
            x = 5;
            y = Math.round((imageSize.height - textSize.height) / 2);
            break;
          case 'right':
            x = imageSize.width - textSize.width - 5;
            y = Math.round((imageSize.height - textSize.height) / 2);
            break;
          case 'bottom':
            x = Math.round((imageSize.width - textSize.width) / 2);
            y = imageSize.height - textSize.height - 5;
            break;
          case 'bottom-left':
            x = 5;
            y = imageSize.height - textSize.height - 5;
            break;
          case 'bottom-right':
            x = imageSize.width - textSize.width - 5;
            y = imageSize.height - textSize.height - 5;
            break;
          case 'middle':
            x = Math.round((imageSize.width - textSize.width) / 2);
            y = Math.round((imageSize.height - textSize.height) / 2);
            break;
          default:
            return reject(new Error('Invalid position'));

        }
        return resolve({x: x, y: y});
      });
  });

}

function getImageSize(filename) {
  return new Promise(function(resolve, reject) {
    return gm(filename)
      .size(function(err, size) {
        if (err) return reject(err);
        return resolve(size);
      });
  });
}

