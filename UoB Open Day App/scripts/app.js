(function (global, $j) {
    
    app = global.app = global.app || {};
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        checkNetworkConnectivity();
    }

    function checkNetworkConnectivity()
    {
        //Initialise without any functions relating to internets:
        //disableWebServiceButtons();
        //disableWebSiteButtons();
        if (navigator.network.connection.type == Connection.NONE
                                    ||navigator.network.connection.type == Connection.CELL_2G
                                    ||navigator.network.connection.type==Connection.UNKNOWN)  
        {
            //No network so leave disabled.
            addErrorMessage("This application requires an internet connection of 3G or higher. Please connect your device to the internet and restart.");
        }                            
        else
        {
            checkWebsite();
            checkWebService();
        }
    }
    
    function disableWebServiceButtons(){
        disableLinks("webServiceButton");
    }
    
    function disableWebSiteButtons(){
        disableLinks("webSiteButton");
    }
    
    function checkWebService()
    {
        //As this folder doesn't exist, should just get an empty JSON object.
        checkUrl("Events Web Service", app.UoBEventsService + '?folderPath=/checktoseeiflive', "webServiceButton");
    }
    
    function checkWebsite()
    {
        checkUrl("University of Birmingham Website", 'http://' + app.UoBWebSite  + '/index.aspx', "webSiteButton");
    }
    
    function checkUrl(serviceDescription, url, buttonClass)
    {
     
            //Check that the service is available:
            $.ajax({
                cache: false,
                type: 'GET',
                url: url,
                timeout: 10000,
                success: function(data, textStatus, XMLHttpRequest) {
                    if (!data) {
                        disableLinks(buttonClass);
                        addErrorMessage(serviceDescription + " is not responding correctly.");
                    }
                    else{
                        console.log("Successfully requested url " + url + " for " + serviceDescription + " with status: " + textStatus);
                        enableLinks(buttonClass);
                        }
                  },
                error: function(jqXHR, textStatus, errorThrown){
                    disableLinks(buttonClass);
                    addErrorMessage(serviceDescription + " is not responding.");
                }
            });
    }
    
    function addErrorMessage(textMessage)
    {
        if (textMessage){
            $j("#welcome-message").after("<p class='errorMessage'>" + textMessage + "</p>");
        }        
    }

    function disableLinks(classToDisable)
    {
        $j("#tabstrip-home li." + classToDisable).hide();
        $j("#appFooter a." + classToDisable).hide();
    }
    
    function enableLinks(classToDisable)
    {
        $j("#tabstrip-home li." + classToDisable).show();
        $j("#appFooter a." + classToDisable).show();
    }
    

})(window, jQuery);
