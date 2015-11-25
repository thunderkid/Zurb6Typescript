var $        		= require('gulp-load-plugins')();
var argv     		= require('yargs').argv;
var gulp     		= require('gulp');
var browser         = require('browser-sync');
var sequence        = require('run-sequence');
var browserify	 	= require('browserify');
var tsify			= require('tsify');
var source 			= require('vinyl-source-stream');
var rimraf          = require('rimraf');
var panini  		= require('panini');

// Check for --production flag
var isProduction = !!(argv.production);

// Port to use for the development server.
var PORT = 8000;

// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

var PATHS = {
  source: 'source',
  output: 'output',
  sass: [
    'node_modules/foundation-sites/scss',
    'node_modules/motion-ui/src/'
  ]
};



var compilationCount = 1;
function logCompilation(projName) {
    console.log(' doing ts/js compilation # '+(compilationCount++)+ ' for ' + projName + ':');
}


function logError(str) {
    //gutil.log(gutil.colors.bgYellow(str));
    console.log(' error '+str);
}


function compiler(mainDir, mainFile, destDir, destFile) {
    logCompilation('release '+destFile);
    var bundler = browserify({basedir: mainDir, debug: true, cache: {}, packageCache: {}, fullPaths: true})
        .add(mainFile)
        .plugin(tsify, { noImplicitAny: false})
        .on('error', function (error) { logError('error: ' + error.toString()); }) 

	var uglify = $.if(isProduction, $.uglify()
    	.on('error', function (e) {
      	console.log(e);
    }));

    var uglify2 = $.if(isProduction, $.streamify($.uglify({mangle: true, mangle_properties: true}).on('error', function (e) {
      	console.log(e);
    })));   // minification. mangle_properties doesn't seem to work.

    return bundler.bundle()
            .pipe(source(destFile))
            .pipe(uglify2)
            .pipe(gulp.dest(destDir));
}


gulp.task('compileTS', function() {
    return compiler('./', 'source/ts/app.ts', 'output/', 'appbundle.js', true);
});


// Copy page templates into finished HTML files
gulp.task('pages', function() {
  gulp.src('source/html/pages/**/*.{html,hbs,handlebars}')
    .pipe(panini({
      root: 'source/html/pages/',
      layouts: 'source/html/layouts/',
      partials: 'source/html/partials/',
      data: 'source/html/data/',
      helpers: 'source/html/helpers/'
    }))
    .pipe(gulp.dest('output'));
});


gulp.task('pages:reset', function(cb) {
  panini.refresh();
  gulp.run('pages');
  cb();
});


// Delete the "output" folder
// This happens every time a build starts
gulp.task('clean', function(done) {
  rimraf('output', done);
});



// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', function() {
  var uncss = $.if(isProduction, $.uncss({  // this removes unused css
    html: ['source/**/*.html'],  // 
    ignore: [
      new RegExp('^meta\..*'),
      new RegExp('^\.is-.*')
    ]
  }));

  var minifycss = $.if(isProduction, $.minifyCss());

  return gulp.src('source/scss/app.scss')
    .pipe($.sourcemaps.init())
    .pipe($.sass({
      includePaths: PATHS.sass
    })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
 //   .pipe(uncss)
    .pipe(minifycss)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('output'));  // will name it output/app.css  
});


// Build the "output" folder by running all of the above tasks
gulp.task('build', function(done) {
  sequence('clean', ['pages', 'sass', 'compileTS'], done);
});

// Start a server with LiveReload to preview the site in
gulp.task('server', ['build'], function() {
  browser.init({
    server: 'output', port: PORT
  });
});


// Build the site, run the server, and watch for file changes
gulp.task('default', ['build', 'server'], function() {
  gulp.watch(['source/html/pages/**/*.html'], ['pages', browser.reload]);
  gulp.watch(['source/html/{layouts,partials}/**/*.html'], ['pages:reset', browser.reload]);
  gulp.watch(['source/scss/**/*.scss'], ['sass', browser.reload]);
  gulp.watch(['source/ts/**/*.ts'], ['compileTS', browser.reload]);
  //gulp.watch(['src/assets/img/**/*'], ['images', browser.reload]);
});
