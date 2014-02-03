(function (global, $j) {
    
    app = global.app = global.app || {};
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        if (navigator.network.connection.type == Connection.NONE
                                    ||navigator.network.connection.type == Connection.CELL_2G
                                    ||navigator.network.connection.type==Connection.UNKNOWN)  
        {
            disableApp("This application requires an internet connection of 3G or higher. Please connect your device to the internet and restart.");
        }                            
        else
        {
            //As this folder doesn't exist should just get back an empty json object:
            var url = app.UoBEventsService + '?folderPath=/checktoseeiflive';
            //Check that the service is available:
            $.ajax({
                cache: false,
                type: 'GET',
                url: url,
                timeout: 10000,
                success: function(data, textStatus, XMLHttpRequest) {
                    if (!data) {
                        disableApp("Events web service is not responding correctly.");
                    }
                    else{
                        console.log("Successfully requested Events Web Service with status: " + textStatus + " data: " + data);
                        }
                  },
                error: function(jqXHR, textStatus, errorThrown){
                    disableApp("Events web service is not responding.");
                }
            });
        }
    }
    
    function disableApp(textMessage){
        if (textMessage){
            $j("#welcome-message").after("<p class='errorMessage'>" + textMessage + "</p>");
        }
        $j("#tabstrip-home li:not('.offlineButton')").hide();
        $j("#appFooter a:not('.offlineButton')").hide();
    }
    
})(window, jQuery);
