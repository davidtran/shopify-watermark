var express = require('express');
var router = express.Router();
var Installer = require('../installer/installer.js');
var shopifyApi = require('../helpers/shopifyApi');
var authHelper = require('../helpers/authHelper.js');

router.get('/login', (req, res) => {
 if (!req.query.shop) return res.render('400');
 var api;

 shopifyApi.getApi(req.query.shop)
  .then(tempApi => {
    api = tempApi;
    return authHelper.isShopInstalled(req.query);
  })
  .then(isInstalled => {
    if (isInstalled) {
      if (api.is_valid_signature(req.query, true)){
        req.session.shop = req.query.shop.split('.')[0];
        return res.redirect('/admin');
      } else {
        return res.render('install/login_failed');
      }
    } else {
      var loginUrl = api.buildAuthURL();
      return res.redirect(loginUrl);
    }
  })
  .catch(err => {
    console.log(err);
    return res.render('500')
  })
});

router.get('/callback', (req, res) => {
  var query = req.query;
  if (!query.shop) return res.render(400);
  shopifyApi.getApi(req.query.shop)
    .then(api => {
      var installer = new Installer(api, query);
      return installer.install();
    })
    .then(() => {
      req.session.shop = req.query.shop.split('.')[0];
      return res.redirect('/admin?shop=' + req.query.shop);
    })
    .error(err => {

      return res.render('500', {
        err: err
      })
    })
});

router.get('/import-product', (req, res) => {
  shopifyApi.getApi(req.query.shop)
    .then(api => {
      var installer = new Installer(api, req.query);
      return installer.importProduct()
        .then(() => {
          res.sendStatus(200);
        })
    })
    .then(() => {
    });
});

module.exports = router;