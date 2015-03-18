var gulp = require('gulp');
var jshint = require('gulp-jshint');
var mocha = require('gulp-mocha');
var stylish = require('jshint-stylish');
var fs = require('fs');

function write(filename, data) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(filename, data, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

gulp.task('default', function() {
});

gulp.task('lint', function() {
  return gulp
    .src(['./*.js', './lib/*.js', './bin/*.js', './tests/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('tests', function() {
  return gulp
    .src('tests/*.tests.js', { read: false })
    .pipe(mocha());
});

gulp.task('example', function() {
  var doc = require('./lib/ramldoc').create({
    template: 'templates/plain/main.hbs'
  });
  var promise = doc.parseFile('examples/jukebox-api/jukebox-api.raml');
  return Promise
    .all([
      promise.then(function(obj) {
        return write('examples/jukebox-api/jukebox-api.json', JSON.stringify(obj, false, '  '));
      }),
      promise.then(function(obj) {
        return doc.render(obj).then(function(text) {
          return write('examples/jukebox-api/jukebox-api.html', text);
        });
      })
    ])
    .catch(function(ex) {
      console.error(ex);
      throw ex;
    });
});

gulp.task('example-watch', function() {
  return gulp.watch(['templates/*', 'examples/jukebox-api/*'], ['example']);
});