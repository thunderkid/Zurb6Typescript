var $        		= require('gulp-load-plugins')();
var gulp     		= require('gulp');
var browserify	 	= require('browserify');
var tsify			= require('tsify');
var source 			= require('vinyl-source-stream');
var rimraf          = require('rimraf');
var panini  		= require('panini');
var isProduction 	= false;  // todo: currently not hardwired.


// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

var PATHS = {
  source: 'source',
  output: 'dist',
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

    return bundler.bundle()
            .pipe(source(destFile))
            .pipe(gulp.dest(destDir));
}


gulp.task('compileTS', function() {
    return compiler('./', 'source/ts/app.ts', 'dist/', 'appbundle.js', true);
});


// Copy page templates into finished HTML files
gulp.task('pages', function() {
  gulp.src('source/pages/**/*.{html,hbs,handlebars}')
    .pipe(panini({
      root: 'source/pages/',
      layouts: 'source/layouts/',
      partials: 'source/partials/',
      data: 'source/data/',
      helpers: 'source/helpers/'
    }))
    .pipe(gulp.dest('dist'));
});


// Delete the "dist" folder
// This happens every time a build starts
gulp.task('clean', function(done) {
  rimraf('dist', done);
});


// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', function() {
  var uncss = $.if(isProduction, $.uncss({  // this removes unused css
    html: ['src/**/*.html'],
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
    .pipe(uncss)
    .pipe(minifycss)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest('dist'));  // will name it dist/app.css  
});

