(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.log = uob.log || {};
    
    uob.log.cacheMessages = false;
    
    uob.log.addErrorMessage = function (message)
    {
        if (message){
            $j("#error-message").append("<p>" + message + "</p>");
        }        
    }
    
    uob.log.addLogMessage = function(message)
    {
        $j("#consoleLog").append("<p>" + message + "</p>");
        console.log(message);
        
    }
    
    
    uob.log.addCacheMessage = function(message)
    {
        
        if (!uob.log.cacheMessages)
        {
            $j("#cache-message").append("<p>Currently using cached data</p>");
            uob.log.cacheMessages = true;
        }
        
        uob.log.addLogMessage(message);
    }
    
    
})(window, jQuery);
