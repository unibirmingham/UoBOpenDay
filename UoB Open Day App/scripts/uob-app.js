/*jslint browser: true, devel: true, white: true */

(function (global) {
    "use strict";
    
    global.uob = global.uob || {};
    var uob = global.uob;
    
    uob.app = uob.app || {};
    
    uob.app.reloadApplication = function () {
        var time = new Date().getTime(),
            restartUrl = "index.html?timestamp=" + time;
        
        //Force a reload of the index page with a timestamp
        document.location = restartUrl;

    };
    
}(window));