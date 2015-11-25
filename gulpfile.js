var gulp = require('gulp');
var browserify = require('browserify');
var tsify = require('tsify');
var source = require('vinyl-source-stream');


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

