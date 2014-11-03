var Prismic = require('prismic.io').Prismic,
    Configuration = require('../config/prismic-configuration').Configuration,
    http = require('http'),
    https = require('https'),
    url = require('url'),
    querystring = require('querystring');

// -- Helpers

exports.getApiHome = function(accessToken, callback) {
  Prismic.Api(Configuration.apiEndpoint, callback, accessToken);
};

exports.getDocument = function(ctx, id, slug, onSuccess, onNewSlug, onNotFound) {
  ctx.api.forms('everything').ref(ctx.ref).query('[[:d = at(document.id, "' + id + '")]]').submit(function(err, documents) {
    var results = documents.results;
    var doc = results && results.length ? results[0] : undefined;
    if (err) onSuccess(err);
    else if(doc && (!slug || doc.slug == slug)) onSuccess(null, doc)
    else if(doc && doc.slugs.indexOf(slug) > -1 && onNewSlug) onNewSlug(doc)
    else if(onNotFound) onNotFound()
    else onSuccess();
  });
};

exports.getDocuments = function(ctx, ids, callback) {
  if(ids && ids.length) {
    ctx.api.forms('everything').ref(ctx.ref).query('[[:d = any(document.id, [' + ids.map(function(id) { return '"' + id + '"';}).join(',') + '])]]').submit(function(err, documents) {
      callback(err, documents.results);
    });
  } else {
    callback(null, []);
  }
};

exports.getBookmark = function(ctx, bookmark, callback) {
  var id = ctx.api.bookmarks[bookmark];
  if(id) {
    exports.getDocument(ctx, id, undefined, callback);
  } else {
    callback();
  }
};

// -- Exposing as a helper what to do in the event of an error (please edit prismic-configuration.js to change this)
exports.onPrismicError = Configuration.onPrismicError;

// -- Route wrapper that provide a "prismic context" to the underlying function

exports.route = function(callback) {
  return function(req, res) {
    var accessToken = (req.session && req.session['ACCESS_TOKEN']) || Configuration.accessToken || undefined
    exports.getApiHome(accessToken, function(err, Api) {
      if (err) { exports.onPrismicError(err, req, res); return; }
      var ref = req.query['ref'] || Api.master(),
          ctx = {
            api: Api,
            ref: ref,
            maybeRef: ref == Api.master() ? undefined : ref,

            oauth: function() {
              var token = accessToken;
              return {
                accessToken: token,
                hasPrivilegedAccess: !!token
              }
            },

            linkResolver: function(ctx, doc) {
              return Configuration.linkResolver(ctx, doc);
            }
          };
      res.locals.ctx = ctx;
      callback(req, res, ctx);
    });
  };
};

// -- OAuth routes

var redirectUri = function(req) {
  return req.protocol + '://' + req.get('Host') + '/auth_callback';
};

exports.signin = function(req, res) {
  exports.getApiHome(undefined, function(err, Api) {
    if (err) { exports.onPrismicError(err, req, res); return; }
    var endpointSpec = url.parse(Api.data.oauthInitiate);

    endpointSpec.query = endpointSpec.query || {};
    endpointSpec.query['client_id'] = Configuration.clientId;
    endpointSpec.query['redirect_uri'] = redirectUri(req);
    endpointSpec.query['scope'] = 'master+releases';

    res.redirect(301, url.format(endpointSpec));
  });
};

exports.authCallback = function(req, res) {
  exports.getApiHome(undefined, function(err, Api) {
    if (err) { exports.onPrismicError(err, req, res); return; }
    var endpointSpec = url.parse(Api.data.oauthToken),
        h = endpointSpec.protocol == 'https:' ? https : http,
        postData = querystring.stringify({
          'grant_type' : 'authorization_code',
          'code': req.query['code'],
          'redirect_uri': redirectUri(req),
          'client_id': Configuration.clientId,
          'client_secret': Configuration.clientSecret
        });

    var postOptions = endpointSpec;
    postOptions.method = 'POST';
    postOptions.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': postData.length
    };

    var postRequest = h.request(postOptions, function(response) {
      var jsonStr = '';

      response.setEncoding('utf8');
      response.on('data', function (chunk) {
        jsonStr += chunk;
      });

      response.on('end', function () {
        var accessToken = JSON.parse(jsonStr)['access_token'];
        if(accessToken) {
          req.session['ACCESS_TOKEN'] = accessToken;
        }
        res.redirect(301, '/');
      });
    });

    postRequest.write(postData);
    postRequest.end();
  });
};

exports.signout = function(req, res) {
  delete req.session['ACCESS_TOKEN'];
  res.redirect(301, '/');
};
