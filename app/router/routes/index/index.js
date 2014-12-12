var express = require('express'),
    router = express.Router(),
    Prismic = require('prismic.io').Prismic,
    prismicHelper = require('../../../assets/javascripts/prismic/prismic-helpers');

router.get('/', prismicHelper.route(function(req, res, ctx){
  ctx.api.form('everything')
    .query(Prismic.Predicates.at("document.type", "blog"))
    .ref(ctx.ref).submit(function(err, docs){
      if (err){ prismicHelper.onPrismicError(err, req, res); return; }
      res.render('index', { docs: docs });
    });
}));

module.exports = router;
