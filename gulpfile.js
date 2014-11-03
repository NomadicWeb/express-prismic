var gulp   = require('gulp'),
    stylus = require('gulp-stylus'),
    axis   = require('axis'),
    nmon   = require('gulp-nodemon');

gulp.task('stylus', function () {
  gulp.src('./app/assets/stylesheets/style.styl')
  .pipe(stylus({use: [axis()]}))
  .pipe(gulp.dest('./app/assets/stylesheets'));
});

gulp.task('watch', function(){
    gulp.watch("./app/assets/stylesheets/*.styl", ['stylus']);
});

gulp.task('dev', function() {
  nmon({script: 'server.js'});
});

gulp.task('default', ['dev', 'watch']);
