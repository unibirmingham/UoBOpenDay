(function (global, $j) {
 
    var app = global.app = global.app || {};
    app.uobSettings = app.uobSettings || {};
    
    var uob = global.uob = global.uob || {};
    
    
    app.uobSettings.EventsService = 'http://www.birminghamdev1.bham.ac.uk/web_services/Events.svc/';
    app.uobSettings.MapsService = 'http://www.birminghamdev1.bham.ac.uk/web_services/Maps.svc/';
    app.uobSettings.WebSite = 'www.birmingham.ac.uk';
    
    app.uobSettings.testMode = true; //test mode uses the local data files.
    
    app.uobSettings.populateSettingsInfo = function(e)  {
        
        //Show the connection type:
        $j('#settingsContent .connectionTypeData').text(navigator.network.connection.type);  
        
        //Where is data coming from:
        $j('#settingsContent .birminghamWebSite').text(app.uobSettings.WebSite); 
        $j('#settingsContent .eventsWebService').text(app.uobSettings.EventsService); 
        $j('#settingsContent .mapsWebService').text(app.uobSettings.MapsService); 
        
    }
    
})(window, jQuery);