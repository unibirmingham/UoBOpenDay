(function (global, $j) {
 
    var app = global.app = global.app || {};
    
    var uob = global.uob = global.uob || {};
    uob.url = uob.url || {};
    
    uob.url.EventsService = 'http://www.birminghamdev1.bham.ac.uk/web_services/Events.svc/';
    uob.url.MapsService = 'http://www.bhamlive2.bham.ac.uk/web_services/Maps.svc/';
    uob.url.WebSite = 'www.birmingham.ac.uk';
    
    uob.testMode = true; //test mode uses the local data files.
    
    app.populateSettingsInfo = function(e)  {
        
        //Show the connection type:
        $j('#settingsContent .connectionTypeData').text(navigator.network.connection.type);  
        
        //Where is data coming from:
        $j('#settingsContent .birminghamWebSite').text(uob.url.WebSite); 
        $j('#settingsContent .eventsWebService').text(uob.url.EventsService); 
        $j('#settingsContent .mapsWebService').text(uob.url.MapsService); 
        
    }
    
})(window, jQuery);