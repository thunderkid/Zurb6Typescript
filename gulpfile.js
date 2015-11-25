var $        		= require('gulp-load-plugins')();
var gulp     		= require('gulp');
var browserify	 	= require('browserify');
var tsify			= require('tsify');
var source 			= require('vinyl-source-stream');
var isProduction 	= false;  // todo: currently not hardwired.


// Browsers to target when prefixing CSS.
var COMPATIBILITY = ['last 2 versions', 'ie >= 9'];

var PATHS = {
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


gulp.task('compiletest', function() {
    return compiler('./', 'ts/app.ts', 'jsBundles/', 'appbundle.js', true);
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

  return gulp.src('scss/app.scss')
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
    .pipe(gulp.dest('dist/css'));
});

