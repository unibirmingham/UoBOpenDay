function populateAboutInfo(e) {
    
    //Show the connection type:
    $('#aboutContent .connectionTypeData').text(navigator.network.connection.type);  
    
    //Where is data coming from:
    $('#aboutContent .birminghamWebSite').text(app.UoBWebSite); 
    $('#aboutContent .eventsWebService').text(app.UoBEventsService); 
    
    }