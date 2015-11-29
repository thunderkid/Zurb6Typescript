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
var plumber 	    = require('gulp-plumber');
var notifier	    = require('node-notifier')

// pass param --site="Site2" etc.
var appName = !!(argv.site) ? argv.site : 'Site1';
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


var tsStartFile = `source/ts/${appName}/app.ts`;
var scssStartFile = `source/scss/${appName}/app.scss`;
var htmlSourceDir = `source/html/${appName}/`;
var htmlPagesPattern = htmlSourceDir+'pages/**/*.{html,hbs,handlebars}';
var imagesSourceDir = `source/images/${appName}/`;
var imagesPattern = imagesSourceDir+'**/*.{jpg,JPG,gif,GIF,bmp,BMP}';  // exclude .db thumbs that get created if you just open folder in explorer.

var htmlPartialsDir =  'source/html/partials/';   // using this as a common location of reusable partials for all apps.
var commonTsDir = 'source/ts/common/';	  // common typescript functionality

var tsOutputFile = 'appbundle.js';
var outputDir = `output/${appName}`;

var errorList = [];
function logError(err) {
    console.log(' error '+ err);
    errorList.push(err);
    this.emit('end');    // as advised by http://blog.ibangspacebar.com/handling-errors-with-gulp-watch-and-gulp-plumber/   which also recommends using gulp-plumber for error handling.
}

function logBuildDone() {
	notifier.notify(
	{
		title: (errorList.length > 0 ? "FAILED" : "Ok"),
		message: (errorList.length > 0 ? `Errors:\n${errorList.join("\n")}` : 'no errors'),
		sound: (errorList.length > 0)
	});
	console.log(`build completed: ${errorList.length} errors`);
	errorList = [];
}

gulp.task('compileTS', function() {
   	console.log('starting TS compiler');
    var bundler = browserify({basedir: './', debug: true, cache: {}, packageCache: {}, fullPaths: true})
        .add(tsStartFile)
        .plugin(tsify, { noImplicitAny: false});

    var uglify = $.if(isProduction, $.streamify($.uglify({mangle: true, mangle_properties: true}).on('error', logError)));      // minification. mangle_properties doesn't seem to work.

    return bundler.bundle()
        	.on('error', logError) 
            .pipe(source(tsOutputFile))
            .pipe(uglify)
            .pipe(gulp.dest(outputDir));
});


// Copy page templates into finished HTML files
gulp.task('pages', function() {

  return gulp.src(htmlPagesPattern)
    //.pipe(plumber({handleError: logError}))  // this doesn't seem to work. No documentation on panini errors.
    .pipe(panini({
      root: htmlSourceDir+'pages/',
      layouts: htmlSourceDir+'layouts/',
      partials: htmlPartialsDir,   // using this as a common location of reusable partials for all apps.
      data: htmlSourceDir+'data/',
      helpers: htmlSourceDir+'helpers/'
    }))
    .pipe(gulp.dest(outputDir));
});


gulp.task('pages:reset', function(callback) {
  sequence('paniniRefresh', 'pages', callback);
});


gulp.task('paniniRefresh', function(callback) {
	panini.refresh();
	callback();
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
//    html: ['source/**/*.html'],  // and this needs to be changed if we ever use it. Needs to include partials too (but shared partials could be too broad). Alternatively could use final html output. But then we'd need to make sure
													// it's run in sequence, after html has been produced.
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
      .on('error', logError))  // my own logError works. Also $.sass.logError works. But creating a function onErr(err) that calls $.sass.logError(err) fails. Even binding it. Don't know why.
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
   // .pipe(uncss)
    .pipe(minifycss)
    .pipe($.if(!isProduction, $.sourcemaps.write()))
    .pipe(gulp.dest(outputDir));
});


// Copy images to the output folder
// In production, the images are compressed
gulp.task('images', function() {
  console.log(imagesPattern + '    ->     ' + outputDir);
  var imagemin = $.if(isProduction, $.imagemin({
    progressive: true
  }));

  return gulp.src(imagesPattern)
    .pipe(imagemin)
    .pipe(gulp.dest(outputDir+'/images'));
});


// Build the "output" folder by running all of the above tasks
gulp.task('build', function(done) {
  sequence('clean', ['pages', 'sass', 'compileTS', 'images'], done);
});

// Start a server with LiveReload to preview the site in
gulp.task('server', ['build'], function() {
  logBuildDone();
  browser.init({
    server: 'output', startPath: `/${appName}`, port: PORT
  });
});


function reportAndReload(callback) {
	logBuildDone();
	browser.reload();
	callback();
}

gulp.task('pagesAndReload', ['pages'], reportAndReload);
gulp.task('pagesResetAndReload', ['pages:reset'], reportAndReload);
gulp.task('sassAndReload', ['sass'], reportAndReload);
gulp.task('compileTSAndReload', ['compileTS'], reportAndReload);
gulp.task('imagesAndReload', ['images'], reportAndReload);


// Build the site, run the server, and watch for file changes
gulp.task('default', ['build', 'server'], function() {
  gulp.watch([htmlPagesPattern], ['pagesAndReload']);
  gulp.watch([htmlSourceDir+'layouts/**/*.html', htmlPartialsDir+'**/*.html'], ['pagesResetAndReload']);
  gulp.watch([`source/scss/${appName}/`+'**/*.scss'], ['sassAndReload']);
  gulp.watch([`source/ts/${appName}/`+'**/*.ts', commonTsDir+'**/*.ts'], ['compileTSAndReload']);
  gulp.watch([imagesPattern], ['imagesAndReload']);
});