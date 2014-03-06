(function (global, $j) {
    
    
    var app = global.app = global.app || {};
    app.campusMapService = app.campusMapService = app.campusMapService || {};
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.log = uob.log || {};
    app.openDay = app.openDay || {};
    uob.screen= uob.screen || {};
    uob.url= uob.url || {};
    
    var date = new Date();
    var year = date.getFullYear();
    var openDayEventsUrl = uob.url.EventsService + '?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var openDayLocalFile = 'data/events.json';
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady()
    {
        
        $j.support.cors = true;
        
        checkWebsite();
        
        //Initialise start dates:
        app.openDay.initialiseStartDate();
        
        //Setup the basic map data
        app.campusMapService.loadMapData();
        
        //Now initialise data for the various parts of the app:
        uob.events.eventsRepository.initialise(openDayEventsUrl, openDayLocalFile);
        
        
    }
    
    var checkWebsite = function()
    {
        uob.web.checkUrl("University of Birmingham Website", 'http://' + uob.url.WebSite  + '/index.aspx', "webSiteButton");
    }
    
    
})(window, jQuery);
