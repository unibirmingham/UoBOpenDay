(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.error = uob.error || {};
    
    //Handler for the global object
    global.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
    
        uob.error.sendErrorMessageToUoB("Global Error", errorMsg, url, lineNumber, column, errorObj);
        
    }
    
    var jQueryDispatchFunction = jQuery.event.dispatch;
    jQuery.event.handle = function () {
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
        navigator.notification.confirm("There has been an error. Would you like to send information about the error and your phone model and operating system to help the University of Birmingham prevent this error in future?", 
            function(buttonIndex){
                    if (buttonIndex===1){
                        
                        var device = global.device.model;
                        var platform = global.device.platform;
                        var version = global.device.version;
                        
                        $j.post("http://uob-mob-report.bham.ac.uk/report.aspx", {device: encodeValue(device), 
                            	platform: encodeValue(platform), 
                            	version: encodeValue(version), 
                            	name: encodeValue(name), 
                            	message: encodeValue(message), 
                            	filename: encodeValue(filename), 
                            	lineNumber: encodeValue(lineNumber), 
                            	columnNumber: encodeValue(columnNumber), 
                            	stack: encodeValue(stack)});
                    }
                },
            'Send error data to UoB?','Send data, Cancel');
    	}
        catch(err)
        {
            //just ignore this and return out
            
        }
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