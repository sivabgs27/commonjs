var gulp = require('gulp');
var ts = require('gulp-typescript');

gulp.task('default', function () {
    var tsProject = ts.createProject('./tsconfig.json');
    var tsResult = tsProject.src()
        .pipe(ts(tsProject));
    return tsResult.js.pipe(gulp.dest('./'));
});
