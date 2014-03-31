(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.log = uob.log || {};
    
    uob.log.addLogMessage = function(message, level)
    {
        var now = new Date();
        var messageClass = "logMessage";
        if (level)
        {
             messageClass = "log" + level;   
        }
        message = now.getHours() + ":" + String("00" + now.getMinutes()).slice(-2) + ":" + String("00" + now.getSeconds()).slice(-2) + "." + String("000" + now.getMilliseconds()).slice(-3) + " - " + message;
        $j("#consoleLog").append('<p class="' + messageClass + '">' + message + "</p>");
        console.log(message);
        
    }
    
    uob.log.addLogWarning = function(message)
    {
        uob.log.addLogMessage(message, "Warning");
    }
    
    uob.log.addLogError = function(message)
    {
        uob.log.addLogMessage(message, "Error");
    }
    

    uob.log.addLogInfo = function(message)
    {
        uob.log.addLogMessage(message, "Info");        
    }
    
    
})(window, jQuery);
