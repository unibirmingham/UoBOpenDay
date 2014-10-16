(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    var app = global.app = global.app || {};
    uob.error = uob.error || {};
    uob.log = uob.log || {};
    
    var postErrorMessage = null;
    
    
    //Handler for the global object
    global.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    
        uob.error.sendErrorMessageToUoB("Global Error", errorMsg, url, lineNumber, column, errorObj);
        
    }
    
    var jQueryDispatchFunction = jQuery.event.dispatch;
    jQuery.event.dispatch = function () {
       try {
          jQueryDispatchFunction.apply(this, arguments);
       } catch (exception) {
          
    		var name = exception.name;
    		var message = exception.message;
    		var filename = exception.fileName;
    		var lineNumber = exception.lineNumber;
    		var columnNumber = exception.columnNumber;
    		var stack = exception.stack;

			uob.error.sendErrorMessageToUoB(name, message, filename, lineNumber, columnNumber, stack);
    		
       }
    }
    
    
    uob.error.sendErrorMessageToUoB = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        try{
        
            if (postErrorMessage===null)
            {
                postErrorMessage=false;
                navigator.notification.confirm("There has been an error. Would you like to send information about the error and your phone model and operating system to help the University of Birmingham prevent this error in future?", 
                    function(buttonIndex){
                        if (buttonIndex===1){
                            postErrorMessage = true;
                            postErrorMessageToUoB(name, message, filename, lineNumber, columnNumber, stack);
                                 }
                    },
                    'Send error data to UoB?','Send data, Cancel');
        	}
            else{
                if (postErrorMessage){
                    postErrorMessageToUoB(name, message, filename, lineNumber, columnNumber, stack);
                }
                else{
                    logErrorSummary("Unposted error:" + name, message, filename, lineNumber, columnNumber, stack);
                }
            }
        }
        catch(err)
        {
            logErrorSummary("Posting error:" + name, message, filename, lineNumber, columnNumber, stack);
        }
    }
    
    var logErrorSummary = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        uob.log.addLogError("Error: Name: " + name + ", message: " + message + ", filename: " + filename + ", line: " + lineNumber + ", column: " + columnNumber + ", stack: " + stack);
    };
    
    var postErrorMessageToUoB = function(name, message, filename, lineNumber, columnNumber, stack)
    {
        
        var device = global.device.model;
        var platform = global.device.platform;
        var version = global.device.version;
        
        $j.post("http://uob-mob-report.bham.ac.uk/report.aspx",
                {
                application: encodeValue(app.uobApplicationName),
                device: encodeValue(device), 
            	platform: encodeValue(platform), 
            	version: encodeValue(version), 
            	name: encodeValue(name), 
            	message: encodeValue(message), 
            	filename: encodeValue(filename), 
            	lineNumber: encodeValue(lineNumber), 
            	columnNumber: encodeValue(columnNumber), 
            	stack: encodeValue(stack)});

        logErrorSummary("Sending message about:" + name, message, filename, lineNumber, columnNumber, stack);
        
    }
    
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