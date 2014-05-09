(function (global, $j) {
 
    var app = global.app = global.app || {};
    app.uobSettings = app.uobSettings || {};
      
    
    app.uobSettings.EventsService = 'http://www.bhamtest4.bham.ac.uk/web_services/Events.svc/';
    app.uobSettings.MapsService = 'http://www.bhamtest4.bham.ac.uk/web_services/Maps.svc/';
    app.uobSettings.WebSite = 'www.birmingham.ac.uk';
    app.uobSettings.OpenDayEventsFolder='/undergraduate/visit/opendays/';
    app.uobSettings.testMode = false; //test mode uses the local data files.
    
    app.uobSettings.populateSettingsInfo = function(e)  {
        
        var settingsAndMessages = $j('#settingsAndMessages');
        var settingsButton = $j('#settingsButton');
        settingsAndMessages.hide();
                
        settingsButton.off('click');
        
        settingsButton.on('click', function(){
           
           if (settingsAndMessages.hasClass('openLog') ){
               settingsButton.text('Show Settings and Logs');
               settingsAndMessages.removeClass('openLog');
               settingsAndMessages.slideUp();
           } else {
               settingsButton.text('Hide Settings and Logs');
               settingsAndMessages.addClass('openLog');
               settingsAndMessages.slideDown();
           }
        });
        
        //Show the connection type:
        $j('#settingsContent .connectionTypeData').text(navigator.network.connection.type);  
        
        //Where is data coming from:
        $j('#settingsContent .birminghamWebSite').text(app.uobSettings.WebSite); 
        $j('#settingsContent .eventsWebService').text(app.uobSettings.EventsService); 
        $j('#settingsContent .mapsWebService').text(app.uobSettings.MapsService); 
        
    }
    
})(window, jQuery);