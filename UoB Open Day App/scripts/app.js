(function (global, $j) {
    
    app = global.app = global.app || {};
    uob = global.uob = global.uob || {};
    url = uob.url = uob.url || {};
    
    uob.cachedData = false;
    
    app.addErrorMessage = function (message)
    {
        if (message){
            $j("div#tabstrip-home div.error-message").append("<p>" + textMessage + "</p>");
        }        
    }
    
    app.addCacheMessage = function(message)
    {
        
        if (!uob.cachedData)
        {
            $j("div#tabstrip-home div.cache-message").append("<p>Currently using cached data</p>");
            uob.cachedData = true;
        }
        
        app.addLogMessage(message);
    }
    
    app.addLogMessage = function(message)
    {
        $j("div#tabstrip-about div#consoleLog").append("<p>" + message + "</p>");
        console.log(message);
        
    }
    
    app.enableLinks = function(classToEnable)
    {
        $j("#tabstrip-home li." + classToEnable).removeClass(classToEnable);
        $j("#appFooter a." + classToEnable).removeClass(classToEnable);
    }
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        checkNetworkConnectivity();
    }

    function checkNetworkConnectivity()
    {
        //Initialise without any functions relating to internets:
        if (navigator.network.connection.type === Connection.NONE
                                    ||navigator.network.connection.type === Connection.CELL_2G
                                    ||navigator.network.connection.type ===Connection.UNKNOWN)  
        {
            //No network so leave disabled.
            app.addErrorMessage("This application requires an internet connection of 3G or higher. Please connect your device to the internet and restart this application.");
        }                            
        else
        {
            checkWebsite();
        }
    }
    
    function checkWebsite()
    {
        checkUrl("University of Birmingham Website", 'http://' + uob.url.WebSite  + '/index.aspx', "webSiteButton");
    }
    
    function checkUrl(serviceDescription, url, buttonClass)
    {
     
            app.addLogMessage(serviceDescription + ": Requesting from url: " + url);
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
                    app.addErrorMessage(serviceDescription + " is not responding.");
                }
            });
    }
    
})(window, jQuery);
