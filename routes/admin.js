var express = require('express');
var router = express.Router();
var watermarkHelper = require('../helpers/watermarkHelper.js');
var Promise = require('bluebird');
var models = require('../models');
var queueHelper = require('../helpers/queueHelper.js');
var shopChecker = require('../middlewares/shopChecker.js');
var fs = require('fs');
var imageHelper = require('../helpers/imageHelper.js');
var multer = require('multer');
var upload = multer({
  dest: 'upload/'
})
module.exports = router;

process.on("unhandledRejection", function(reason, promise) {
    console.log(reason, promise);
});

process.on("rejectionHandled", function(promise) {
    console.log(promise);
});

router.get('/', shopChecker, (req, res) => {
  return getPreviewDefaultData(req)
    .then(defaultData => {
      return res.render('admin/index', {
        form: defaultData.form,
        fontNames: defaultData.fontNames,
        previewImageUrl: defaultData.previewImageUrl,
        shop: req.data.shop
      });
    })
});

function getPreviewDefaultData(req, mergeFormData) {
  var shop = req.data.shop.shop;

  var form = {
    text: shop,
    fontSize: '30',
    fontName: 'Arial',
    position: 'bottom-right',
    textColor: 'black',
    opacity: 70,
    imageSize: 100
  }

  if (mergeFormData) {
    for (key in mergeFormData) {
      form[key] = mergeFormData[key];
    }
  }

  var fontNames = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana',
    'Gill Sans'
  ];

  var previewImage;
  return models
    .ProductImage
    .findOne({
      ShopId: req.data.shop.id
    })
    .then(image => {
      previewImage = image;
      return imageHelper.getImagePath(image);
    })
    .then(path => {
      return {
        form: form,
        fontNames: fontNames,
        previewImageUrl: previewImage.src,
        previewImagePath: path
      }
    })

}


router.post('/', shopChecker, upload.single('image'), (req, res) => {
  console.log(req.body, req.file);
  var error = validateRequest(req);
  if (error) return res.status(500).send(error.message);

  var base64ImageResult, defaultDataResult;
  return getPreviewDefaultData(req, req.body)
    .then(defaultData => {
      defaultDataResult = defaultData;
      if (req.body.type == 'text') {
        req.session.lastUploadedFile = null;
        console.log('aabbb');
        return watermarkHelper
          .createTextWatermark(
            defaultData.previewImagePath,
            req.body.text,
            req.body.fontSize,
            req.body.position,
            req.body.textColor,
            req.body.fontName,
            req.body.opacity,
            'transparent');
      } else if (!req.file && req.session.lastUploadedFile){
        console.log('aa');
        var lastUploadedFile = getFileFromSession(req);

        return watermarkHelper.createImageWatermark(
          defaultData.previewImagePath,
          lastUploadedFile,
          req.body.imageSize,
          req.body.position,
          req.body.opacity,
          'transparent'
        )
      } else if (req.file) {
        console.log(req.file);
        return getUploadedFilePath(req.file)
          .then(uploadedPath => {
            req.session.lastUploadedFile = uploadedPath;
            return watermarkHelper.createImageWatermark(
              defaultData.previewImagePath,
              uploadedPath,
              req.body.imageSize,
              req.body.position,
              req.body.opacity,
              'transparent'
            )
          });
      } else {
        return res.status(400).send('Missing file');
      }


    })
    .then((imagePath) => {
      return require('../helpers/base64Image.js').convertImageTo64(imagePath, true);
    })
    .then((base64Image) => {
      base64ImageResult = base64Image
      res.status(200).send(base64Image);
    })
    .catch(err => {
      console.log(err);
      res.status(500).send();
    });

});

router.post('/save-watermark', shopChecker, (req, res) => {
  console.log(req.body);
  if (req.body.type == 'image' && req.file == null) {
    req.file = req.session.lastUploadedFile;
  }

  var watermarkConfig = req.body;
  var shopifyImageHelper
  var api;
  var shopModel = req.data.shop;

  var formError= validateRequest(req);
  if (formError) return res.status(400).send(formError.message);

  return models
    .WatermarkConfig
    .find({
      where: {
        ShopId: shopModel.id
      }
    })
    .then(config => {
      if (!config) {
        watermarkConfig.ShopId = shopModel.id
        config = models.WatermarkConfig.build({
          ShopId: shopModel.id
        })
      }
      return config.save();

    })
    .then(config => {
      if (req.body.type == 'text') {
        config.text = watermarkConfig.text;
        config.fontSize = watermarkConfig.fontSize;
        config.position = watermarkConfig.position;
        config.fontName = watermarkConfig.fontName;
        config.textColor = watermarkConfig.textColor;
        config.opacity = watermarkConfig.opacity;
      } else {
        return saveUploadedFile(req, config.id.toString())
          .then(uploadedFile => {
            config.imagePath = uploadedFile;
            config.imageSize = watermarkConfig.imageSize;
            config.opacity = watermarkConfig.opacity;
            config.position = watermarkConfig.position;
            return config.save();
          });

      }

      return config.save();
    })
    .then(() => {
      return models
        .ProductImage
        .findAll({
          where: {
            ShopId: shopModel.id
          }
        });
    })
    .then(images => {
      var delay = 0;
      var ps = [];
      if (req.body.updateWatermark && req.body.updateWatermark == 'true') {
        images.forEach(image => {
          delay += 150;
          ps.push(queueHelper.createWatermarkJob(image, delay));
        })
        return Promise.all(ps);
      }
    })
    .then(() => res.sendStatus(200))
    .catch(err => {
      res.status(400).send(err.message)
    });

});

router.post('/remove-watermark', shopChecker, (req, res) => {
  return models
    .ProductImage
    .findAll({
      ShopId: req.data.shop.id
    })
    .then(images => {
      var pms = [];
      var delay = 0;
      images.forEach(image => {
        pms.push(queueHelper.removeWatermark(image.id));
        delay += 200;
      });
      return Promise.all(pms);
    })
    .then(() => res.status(200).send())
    .catch(err => {
      res.status(400).send();
    });
});

router.post('/automatic-add-watermark', shopChecker, (req, res) => {
  req.data.shop.autoWatermark = req.data.shop.autoWatermark ? false : true;
  return req.data.shop.save()
    .then(() => res.status(200).send())
    .catch(err => {console.log(err);res.status(400).send()})
})

function validateRequest(req) {
  if (req.body.type == 'image') {
    if (!(req.file || req.session.lastUploadedFile)) {
      return new Error('Please select an image');
    }

    if (!req.body.imageSize || !req.body.opacity || !req.body.position) {
      return new Error('Missing parameters for image watermark');
    }
  } else if (!req.body.opacity || !req.body.text || !req.body.fontSize || !req.body.position || !req.body.textColor) {
    return new Error('Please fill all fields');
  }

  var opacity = parseInt(req.body.opacity);
  if (opacity < 0 || opacity > 100) {
    return new Error('Invalid opacity');
  }
}

function getFileFromSession(req) {
  if (req.body.type == 'image' && !req.file && req.session.lastUploadedFile) {
    return req.session.lastUploadedFile;
  }
  return null;
}

function saveUploadedFile(req, name) {
  return new Promise((resolve, reject) => {
    if (!req.session.lastUploadedFile) return reject(new Error('File not found'));
    uploadedFile = req.session.lastUploadedFile
    var ext = uploadedFile.substr(uploadedFile.lastIndexOf('.') + 1)
    var saveFile = __dirname + '/../public/img/watermark-image/' + name + '.' + ext;
    return fs.createReadStream(uploadedFile)
      .pipe(fs.createWriteStream(saveFile))
      .on('close', () => resolve(saveFile))
      .on('error', err => reject(err))
  })

}

function getUploadedFilePath(uploadedFile) {
  return new Promise((resolve, reject) => {
    var ext = getExtensionFromMimetype(uploadedFile.mimetype);
    if (!ext) return reject(new Error('Invalid file type'));
    var maxSize = 5242880; // 5MB
    if (uploadedFile.size > maxSize) return reject(new Error('File is too large'));
    var saveFile = uploadedFile.path + '.' + ext;
    return fs.createReadStream(uploadedFile.path)
      .pipe(fs.createWriteStream(saveFile))
      .on('close', () => resolve(saveFile))
      .on('error', err => reject(err))
  });


 }

function getExtensionFromMimetype(mimetype) {
  switch (mimetype) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
  }
  return null;
}

