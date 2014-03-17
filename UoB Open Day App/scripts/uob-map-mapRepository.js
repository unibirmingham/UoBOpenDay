
(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.map = uob.map || {};

    var _mapItems = null;
    
    uob.map.mapRepository = {
    
        initialise: function (mapDescription, mapsJsonUrl, localFile){
            
            app.application.showLoading();
            uob.log.addLogMessage("Initialising Map Data");            
            uob.json.getJSON (mapDescription, mapsJsonUrl, localFile, mapSuccess, mapCacheSuccess, mapError);

        },
        getMaps: function()
        {
            return _mapItems;
        }
        
    };
    
    var mapSuccess = function(data)
    {
        setMapData(data);
    };
    
    var mapCacheSuccess = function(data)
    {
        uob.log.addCacheMessage('Maps: Data is from cache');
        setMapData(data);            
    };
    
    var mapError = function(data)
    {
        uob.log.addErrorMessage('No maps data available.');
        app.application.hideLoading();
    };
        
    var setMapData = function(mapItems)
    {
            
        for (var i in mapItems) {
            var mapItem = mapItems[i];
            mapItem.getLatLngBounds = function(){
                 return uob.google.getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
            }
        }
        
        _mapItems = mapItems;
        
        uob.screen.enableLinks("mapRepositoryButton");
        app.application.hideLoading();
    }  

    
})(window, jQuery);