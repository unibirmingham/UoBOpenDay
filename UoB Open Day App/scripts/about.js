
(function (global, $j) {
    
    uob = global.uob = global.uob || {};
    url = uob.url = uob.url || {};

    app.populateAboutInfo = function(e)  {
        
        //Show the connection type:
        $j('#aboutContent .connectionTypeData').text(navigator.network.connection.type);  
        
        //Where is data coming from:
        $j('#aboutContent .birminghamWebSite').text(uob.url.WebSite); 
        $j('#aboutContent .eventsWebService').text(uob.url.EventsService); 
        $j('#aboutContent .mapsWebService').text(uob.url.MapsService); 
        
    }
   
})(window, jQuery);