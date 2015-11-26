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


var appName = 'Site1';  // later make this an array
var tsStartFile = `source/ts/${appName}/app.ts`;
var scssStartFile = `source/scss/${appName}/app.scss`;
var htmlSourceDir = `source/html/${appName}/`;
var outputDir = `output/${appName}`;



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

    var uglify = $.if(isProduction, $.streamify($.uglify({mangle: true, mangle_properties: true}).on('error', function (e) {
      	console.log(e);
    })));   // minification. mangle_properties doesn't seem to work.

    return bundler.bundle()
            .pipe(source(destFile))
            .pipe(uglify)
            .pipe(gulp.dest(destDir));
}


gulp.task('compileTS', function() {
    return compiler('./', tsStartFile, outputDir, 'appbundle.js', true);
});


// Copy page templates into finished HTML files
gulp.task('pages', function() {
//  gulp.src('source/html/**/*.{html,hbs,handlebars}')

//  gulp.src(htmlSourceDir+'**/*.{html,hbs,handlebars}')
//    .pipe(panini({
//      root: htmlSourceDir+'pages/',
//      layouts: htmlSourceDir+'layouts/',
//      partials: htmlSourceDir+'partials/',  // 'source/html/partials/',   // using this as a common location of reusable partials for all apps.
//      data: htmlSourceDir+'data/',
//      helpers: htmlSourceDir+'helpers/'
//    }))
//    .pipe(gulp.dest(outputDir));


  gulp.src('source/html/Site1/pages/**/*.{html,hbs,handlebars}')
    .pipe(panini({
      root: 'source/html/Site1/pages/',
      layouts: 'source/html/Site1/layouts/',
      partials: 'source/html/Site1/partials/',  // 'source/html/Site1/partials/',   // using this as a common location of reusable partials for all apps.
      data: 'source/html/Site1/data/',
      helpers: 'source/html/Site1/helpers/'
    }))
    .pipe(gulp.dest(outputDir));




});


gulp.task('pages:reset', function(cb) {
  panini.refresh();
  gulp.run('pages');
  cb();
});


// Delete the "output" folder
// This happens every time a build starts
gulp.task('clean', function(done) {
  rimraf(outputDir, done);
});



// Compile Sass into CSS
// In production, the CSS is compressed
gulp.task('sass', function() {

//  var uncss = $.if(isProduction, $.uncss({  // this removes unused css. Didn't work - seemed to remove everything.
//    html: ['source/**/*.html'],  // and this needs to be changed if we ever use it.
//    ignore: [
//      new RegExp('^meta\..*'),
//      new RegExp('^\.is-.*')
//    ]
//  }));

  var minifycss = $.if(isProduction, $.minifyCss());

  return gulp.src(scssStartFile)
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
    .pipe(gulp.dest(outputDir));  // will name it output/app.css  
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
