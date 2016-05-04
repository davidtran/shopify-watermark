var express = require('express');
var router = express.Router();
var watermarkHelper = require('../helpers/watermarkHelper.js');
var Promise = require('bluebird');
var models = require('../models');
var queueHelper = require('../helpers/queueHelper.js');
var shopChecker = require('../middlewares/shopChecker.js');
var fs = require('fs');
var imageHelper = require('../helpers/imageHelper.js');
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
        previewImageUrl: defaultData.previewImageUrl
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
    opacity: 70
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
    .findOne()
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


router.post('/', shopChecker, (req, res) => {

  var error = validateRequest(req);
  if (error) return res.render('admin/index', {
    form: defaultData.form,
    fontNames: defaultData.fontNames,
    error: error
  });
  var base64ImageResult, defaultDataResult;
  return getPreviewDefaultData(req, req.body)
    .then(defaultData => {
      defaultDataResult = defaultData;
      return watermarkHelper
        .createTextWatermark(
          defaultData.previewImagePath,
          req.body.text,
          req.body.fontSize,
          req.body.position,
          req.body.textColor,
          req.body.fontName,
          req.body.opacity,
          'transparent')   ;
    })
    .then((imagePath) => {
      return require('../helpers/base64Image.js').convertImageTo64(imagePath, true);
    })
    .then((base64Image) => {
      base64ImageResult = base64Image
      res.status(200).send(base64Image);
    })
    .catch(err => {
      res.status(500).send();
    });

});

router.post('/save-watermark', shopChecker, (req, res) => {
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
        config = models.WatermarkConfig.build(watermarkConfig)
      } else {
        config.text = watermarkConfig.text;
        config.fontSize = watermarkConfig.fontSize;
        config.position = watermarkConfig.position;
        config.fontName = watermarkConfig.fontName;
        config.textColor = watermarkConfig.textColor;
        config.opacity = watermarkConfig.opacity;
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
      if (req.body.updateWatermark) {
        images.forEach(image => {
          delay += 150;
          ps.push(queueHelper.createWatermarkJob(image, delay));
        })
        return Promise.all(ps);
      } else {
        return res.sendStatus(200)
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
  if (!req.body.opacity || !req.body.text || !req.body.fontSize || !req.body.position || !req.body.textColor || !req.body.fontName) {
    return new Error('Please fill all fields');
  }

  var opacity = parseInt(req.body.opacity);
  if (opacity < 0 || opacity > 100) {
    return new Error('Invalid opacity');
  }
}