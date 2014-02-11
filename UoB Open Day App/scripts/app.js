(function (global, $j) {
    
    app = global.app = global.app || {};
    
    app.addErrorMessage = function (textMessage)
    {
        if (textMessage){
            $j("div#tabstrip-home div.error-message").append("<p>" + textMessage + "</p>");
        }        
    }
    
    app.disableLinks = function (classToDisable)
    {
        $j("#tabstrip-home li." + classToDisable).hide();
        $j("#appFooter a." + classToDisable).hide();
    }
    
    app.enableLinks = function(classToEnable)
    {
        $j("#tabstrip-home li." + classToEnable).show();
        $j("#appFooter a." + classToEnable).show();
        $j("#appFooter a." + classToEnable).css('display', 'block');
    }
    
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
            app.addErrorMessage("This application requires an internet connection of 3G or higher. Please connect your device to the internet and restart.");
        }                            
        else
        {
            checkWebsite();
        }
    }
    
    function checkWebsite()
    {
        checkUrl("University of Birmingham Website", 'http://' + app.UoBWebSite  + '/index.aspx', "webSiteButton");
    }
    
    function checkUrl(serviceDescription, url, buttonClass)
    {
     
            //Check that the service is available:
            $j.ajax({
                cache: false,
                type: 'GET',
                url: url,
                timeout: 10000,
                success: function(data, textStatus, XMLHttpRequest) {
                    if (!data) {
                        app.disableLinks(buttonClass);
                        app.addErrorMessage(serviceDescription + " is not responding correctly.");
                    }
                    else{
                        console.log("Successfully requested url " + url + " for " + serviceDescription + " with status: " + textStatus);
                        app.enableLinks(buttonClass);
                        }
                  },
                error: function(jqXHR, textStatus, errorThrown){
                    app.disableLinks(buttonClass);
                    app.addErrorMessage(serviceDescription + " is not responding.");
                }
            });
    }
    
})(window, jQuery);
