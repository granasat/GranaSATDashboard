module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-wiredep');
    grunt.initConfig({
        wiredep: {
            target: {
                src: 'static/index.html' // point to your HTML file.
            }
        }
    });
};
