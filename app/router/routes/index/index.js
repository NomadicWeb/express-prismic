var express = require('express'),
    router = express.Router(),
    prismic = require('../../../assets/javascripts/prismic/prismic-helpers');
router.get('/', prismic.route(function(req, res, ctx) {
  console.log('we are in the router get function');  
  ctx.api.form('everything').set("page", req.param('page') || "1").ref(ctx.ref).submit(function(err, docs) {
    if (err) { prismic.onPrismicError(err, req, res); return; }
    res.render('index', {
      docs: docs
    });
  });
}));

module.exports = router;
