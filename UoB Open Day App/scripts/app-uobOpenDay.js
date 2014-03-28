(function (global) {
    
    var app = global.app = global.app || {};
    var uobOpenDay = app.uobOpenDay = app.uobOpenDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};      
    
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
   
})(window);