(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    

    uob.events.StartDateRepository = function(startDatesDescription, startDatesJsonUrl, localDataFile, initialisedFunction)
    {
      
        var status =  uob.json.JsonStatus.UNINITIALISED;
        
        var startDates;
        
        var getStatus = function(){
            return status;
        };
        
        var hasData = function()
        {
			return uob.json.hasData(status);
        };
        
        var initialise = function(){
            uob.log.addLogMessage("Initialising Start Dates");
            uob.json.getJSON (startDatesDescription, startDatesJsonUrl, localDataFile, startDatesSuccess, startDatesError);
        };
        
        var startDatesSuccess = function(data, jsonStatus){
             if (jsonStatus!== uob.json.JsonStatus.LIVE){
            	uob.log.addCacheMessage("Start dates: Currently using local cache");         
             }
            
            startDates = [];
            
            for (var index = 0; index <data.length; ++index) {
                var startDateValue = data[index];
                var startDate = startDateValue;
                var startDateDescription = uob.date.formatDateAsUK(startDate,'ddd, DD MMM');
                
                var startDateItem = {
                    startDate: startDate,
                    description: startDateDescription
                };
                startDates.push(startDateItem);
            }
            
            status = jsonStatus;
            callInitialisedFunction();
        };
        
        var startDatesError = function(jsonStatus) {
            uob.log.addErrorMessage("Unable to retrieve start date data");
            status = jsonStatus;
            callInitialisedFunction();
        };

        var callInitialisedFunction = function(){
            if (initialisedFunction){
				initialisedFunction();
            }
        };
        
        var getStartDates = function() {
            return startDates;
        }
        
        return{
            getStatus: getStatus,
            getStartDates: getStartDates,
            hasData: hasData,
            initialise: initialise
            
        }
        
    };

   
})(window, jQuery);