(function (global) {
    
    var app = global.app = global.app || {};
    var uobOpenDay = app.uobOpenDay = app.uobOpenDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen = uob.screen || {};
    
    var openDayDateLocalStorageName = 'uob-openday-date';
    
    uobOpenDay.getOpenDayDate = function(){
        return localStorage.getItem(openDayDateLocalStorageName);
    }
    
    uobOpenDay.getOpenDayDateAsDate = function(){
        var openDayDate = uobOpenDay.getOpenDayDate();
        if (openDayDate)
        {
            return uob.json.parseJsonDate(openDayDate);
        }
        return null;
    }
    
    uobOpenDay.setOpenDayDate = function(openDayDate)
    {
        localStorage.setItem(openDayDateLocalStorageName, openDayDate);
    }
   
    
    uobOpenDay.getOpenDayDateValue = function()
    {
        var openDayDate = app.uobOpenDay.getOpenDayDateAsDate();
        var openDayDateInUk = uob.date.formatDateAsUK(openDayDate, 'YYYY-MM-DD');
        return openDayDateInUk;
    };
    
    uobOpenDay.getFilterFunctionForOpenDayDate = function()
    {
        var openDayDateInUk = uobOpenDay.getOpenDayDateValue();
        console.log("Creating filter function for: " + openDayDateInUk);
        var filterFunction = function(eventItem){
            return eventItem.StartDateInUk=== openDayDateInUk;
        };
        return filterFunction;
    };
    
})(window);