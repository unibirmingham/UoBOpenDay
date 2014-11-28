/*jslint browser: true, devel: true, vars: true, white: true */

(function (global) {
    "use strict";

    global.uob = global.uob || {};
    var uob = global.uob;
    uob.web = uob.web || {};
    uob.google = uob.google || {};
    uob.google.apiLoader = uob.google.apiLoader || {};
    
    var apiLoader = uob.google.apiLoader;
    
    var apiLoaded = false;
    var googleApiScript = "https://maps.googleapis.com/maps/api/js?v=3.exp&sensor=true";
    var otherGoogleApiScripts = ["http://google-maps-utility-library-v3.googlecode.com/svn/trunk/maplabel/src/maplabel-compiled.js"];

    var loadScript = function(scriptUrl){
        
        var scriptTag;
        
        scriptTag = document.createElement('script');
        scriptTag.type = 'text/javascript';
        scriptTag.src = scriptUrl;
        document.body.appendChild(scriptTag);
        
    };
    
    var loadGoogleApiScript = function(){
        if (googleApiScript.indexOf('?') > -1){
            googleApiScript = googleApiScript + "&";    
        }
        else{
            googleApiScript = googleApiScript + "?";
        }
        googleApiScript = googleApiScript + 'callback=uob.google.apiLoader.successCallback';
        loadScript(googleApiScript);
    };
    
    apiLoader.isApiLoaded = function(){
        return !(typeof google === "undefined");
    };
    
    apiLoader.loadApiAsynchronously = function(){

        if (apiLoader.isApiLoaded()){
            return;
        }
        
        if (!uob.web.is3GOrBetter()){
            uob.log.addLogWarning("Check google api is loaded with no internet connection so ignoring");
            return;
        }

        loadGoogleApiScript();
        
        return;
    };
    
    apiLoader.successCallback = function(){
        var apiScript;
        var apiScriptCounter;
        
        //Now load the additional scripts:
        for (apiScriptCounter=0; apiScriptCounter < otherGoogleApiScripts.length; apiScriptCounter +=1) {
            apiScript = otherGoogleApiScripts[apiScriptCounter];
            loadScript(apiScript);
        }        
    }
    
}(window));