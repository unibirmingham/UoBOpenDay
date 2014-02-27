(function (global) {
 
    uob = global.uob = global.uob || {};
    
    url = uob.url = uob.url || {};
    
    uob.url.EventsService = 'http://www.birminghamdev1.bham.ac.uk/web_services/Events.svc/';
    uob.url.MapsService = 'http://www.bhamlive2.bham.ac.uk/web_services/Maps.svc/';
    uob.url.WebSite = 'www.birmingham.ac.uk';
    
    uob.testMode = true; //test mode uses the local data files.
    
}
)(window);