var prismic = require('../assets/javascripts/prismic/prismic-helpers');
module.exports = function (app) {
    app.use('/',              require('./routes/index/index.js'));
    app.use('/signin',        prismic.signin);
    app.use('/auth_callback', prismic.authCallback);
};
