(function (global, j$) {
    
    app = global.app = global.app || {};
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        if (navigator.network.connection.type == Connection.NONE
                                    ||navigator.network.connection.type == Connection.CELL_2G
                                    ||navigator.network.connection.type==Connection.UNKNOWN)  
        {
            $j("#welcome-message").after("<p>This application requires an internet connection of 3G or higher. Please connect your device to the internet and restart.</p>");
            //Disable all links so that the application becomes inert.
            $j("a").attr("href", "#");
        }

                            
    }
    
})(window, jQuery);
