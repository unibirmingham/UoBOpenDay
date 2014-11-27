(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    var app = global.app = global.app || {};
    uob.error = uob.error || {};
    uob.log = uob.log || {};
    
    var postErrorMessage = null;
    
    
    //Handler for the global object
    global.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    
        uob.error.sendErrorDetailsToUoB("Global Error", errorMsg, url, lineNumber, column, errorObj);
        
    }
    
    var jQueryDispatchFunction = jQuery.event.dispatch;
    jQuery.event.dispatch = function () {
        try {
            jQueryDispatchFunction.apply(this, arguments);
       }
       catch (exception) {
          
            var name = exception.name;
            var message = exception.message;
            var filename = exception.fileName;
            var lineNumber = exception.lineNumber;
            var columnNumber = exception.columnNumber;
            var stack = exception.stack;
               
            if (!name)
           {
               //If there's no value for name then it might be that the exception itself is just a string.
                name = exception;
           }

			uob.error.sendErrorDetailsToUoB(name, message, filename, lineNumber, columnNumber, stack);
    		
       }
    }
    
    
    uob.error.sendErrorDetailsToUoB = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        try{
        
            if (postErrorMessage===null)
            {
                postErrorMessage=false;
                navigator.notification.confirm("There has been an error. Would you like to send information about the error and your phone model and operating system to help the University of Birmingham prevent this error in future?", 
                    function(buttonIndex){
                        if (buttonIndex===1){
                            postErrorMessage = true;
                            postErrorDetailsToUoB(name, message, filename, lineNumber, columnNumber, stack);
                        }
                        else{
                            postErrorMessage = false;
                        }
                    },
                    'Send error data to UoB?','Send data, Cancel');
        	}
            else{
                if (postErrorMessage){
                    postErrorDetailsToUoB(name, message, filename, lineNumber, columnNumber, stack);
                }
                else{
                    logErrorSummary("Unposted error: " + name, message, filename, lineNumber, columnNumber, stack);
                }
            }
        }
        catch(err)
        {
            logErrorSummary("Problem posting error: " + name, message, filename, lineNumber, columnNumber, stack);
        }
    }
    
    var logErrorSummary = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        uob.log.addLogError("Error: Name: " + name + ", message: " + message + ", filename: " + filename + ", line: " + lineNumber + ", column: " + columnNumber + ", stack: " + stack);
    };
    
    var postErrorDetailsToUoB = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        
        var deviceModel = global.device.model;
        var platform = global.device.platform;
        var deviceVersion = global.device.version;
        var applicationName = app.uobApplicationName;
        
        if (cordova.getAppVersion)
        {
            cordova.getAppVersion(function (applicationVersion) {
                postErrorAndApplicationDetailsToUoB(applicationName, applicationVersion, name, message, filename, lineNumber, columnNumber, stack, deviceModel, platform, deviceVersion);
               });
        }
        else{
            postErrorAndApplicationDetailsToUoB(applicationName, null, name, message, filename, lineNumber, columnNumber, stack, deviceModel, platform, deviceVersion);
        }

        logErrorSummary("Sending message about:" + name, message, filename, lineNumber, columnNumber, stack);        
                
    }
    
    var postErrorAndApplicationDetailsToUoB = function(applicationName, applicationVersion, name, message, filename, lineNumber, columnNumber, stack, deviceModel, platform, deviceVersion){
        
        if (applicationVersion){
            applicationName = applicationName + "-"+ version;
        }
        
        $j.post("http://uob-mob-report.bham.ac.uk/report.aspx",
                {
                application: encodeValue(applicationName),
                device: encodeValue(deviceModel), 
            	platform: encodeValue(platform), 
            	version: encodeValue(deviceVersion), 
            	name: encodeValue(name), 
            	message: encodeValue(message), 
            	filename: encodeValue(filename), 
            	lineNumber: encodeValue(lineNumber), 
            	columnNumber: encodeValue(columnNumber), 
            	stack: encodeValue(stack)});
   };
    var encodeValue = function(value)
    {
        value = "" + value;
        if (!value)
        {
            return "";
        }
        return value.replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
}
)(window, jQuery);