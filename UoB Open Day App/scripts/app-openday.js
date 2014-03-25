(function (global) {
    
    var app = global.app = global.app || {};
    var openDay = app.openDay = app.openDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};      
    
    var openDayDateLocalStorageName = 'uob-openday-date';
    
    openDay.getOpenDayDate = function(){
        return localStorage.getItem(openDayDateLocalStorageName);
    }
    
    openDay.getOpenDayDateAsDate = function(){
        var openDayDate = openDay.getOpenDayDate();
        if (openDayDate)
        {
            return uob.json.parseJsonDate(openDayDate);
        }
        return null;
    }
    
    openDay.setOpenDayDate = function(openDayDate)
    {
        localStorage.setItem(openDayDateLocalStorageName, openDayDate);
    }
   
})(window);