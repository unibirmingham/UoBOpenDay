
(function (global, $j) {
    
    app = global.app = global.app || {};
    

    app.populateAboutInfo = function(e)  {
        
        //Show the connection type:
        $j('#aboutContent .connectionTypeData').text(navigator.network.connection.type);  
        
        //Where is data coming from:
        $j('#aboutContent .birminghamWebSite').text(app.UoBWebSite); 
        $j('#aboutContent .eventsWebService').text(app.UoBEventsService); 
        
    }
   
})(window, jQuery);