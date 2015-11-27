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

var htmlPartialsDir =  'source/html/partials/';   // using this as a common location of reusable partials for all apps.
var commonTsDir = 'source/ts/common/';	  // common typescript functionality

var outputDir = `output/${appName}`;


var compilationCount = 1;
function logCompilation(projName) {
    console.log(' doing ts/js compilation # '+(compilationCount++)+ ' for ' + projName + ':');
}


var errorCount = 0;
function logError(err) {
    //gutil.log(gutil.colors.bgYellow(str));
    console.log(' error '+err);
    errorCount++;
    this.emit('end');
}

function logBuildDone() {
	console.log(`build completed: ${errorCount} errors`)
}


function compiler(mainDir, mainFile, destDir, destFile) {
    console.log('starting TS compiler');
    logCompilation('release '+destFile);
    var bundler = browserify({basedir: mainDir, debug: true, cache: {}, packageCache: {}, fullPaths: true})
        .add(mainFile)
        .plugin(tsify, { noImplicitAny: false});

    var uglify = $.if(isProduction, $.streamify($.uglify({mangle: true, mangle_properties: true}).on('error', logError)));      // minification. mangle_properties doesn't seem to work.

    return bundler.bundle()
        	.on('error', logError) 
            .pipe(source(destFile))
            .pipe(uglify)
            .pipe(gulp.dest(destDir));
}


gulp.task('compileTS', function() {
    return compiler('./', tsStartFile, outputDir, 'appbundle.js', true);
});


// Copy page templates into finished HTML files
gulp.task('pages', function() {

  gulp.src(htmlPagesPattern)
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
  panini.refresh();
  gulp.run('pages');
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
      .on('error', function(e) {logError(e); $.sass.logError(e);}))
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
  logBuildDone();
  browser.init({
    server: 'output', startPath: `/${appName}`, port: PORT
  });
});


gulp.task('clearErrors', function(callback) {
	errorCount = 0;
	callback();
});

function reportAndReload() {
	logBuildDone();
	browser.reload();
}

gulp.task('justCompileTs', function(callback) {
	errorCount = 0;
	gulp.run('compileTS');
	logBuildDone();
	browser.reload();
	callback();
});

// Build the site, run the server, and watch for file changes
gulp.task('default', ['build', 'server'], function() {
  gulp.watch([htmlPagesPattern], ['clearErrors', 'pages', reportAndReload]);
  gulp.watch([htmlSourceDir+'layouts/**/*.html', htmlPartialsDir+'**/*.html'], ['clearErrors', 'pages:reset', reportAndReload]);
  gulp.watch([`source/scss/${appName}/`+'**/*.scss'], ['clearErrors', 'sass', reportAndReload]);
  gulp.watch([`source/ts/${appName}/`+'**/*.ts', commonTsDir+'**/*.ts'], ['justCompileTs']);
  //gulp.watch(['src/assets/img/**/*'], ['images', reportAndReload]);
});