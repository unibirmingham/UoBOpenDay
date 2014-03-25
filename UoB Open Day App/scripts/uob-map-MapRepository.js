
(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.map = uob.map || {};
    uob.data = uob.data || {};

    
    
    uob.map.MapRepository = function(mapDescription, mapsJsonUrl, localFile, initialisedFunction)
    {

        var mapItems = null;
        var status =  uob.json.JsonStatus.UNINITIALISED;
        
        var getStatus = function(){
            return status;
        };
        
        var hasData = function()
        {
			return uob.json.hasData(status);
        };
        
        var initialise = function(){
            uob.log.addLogMessage("Initialising Map Data");
            uob.json.getJSON (mapDescription, mapsJsonUrl, localFile, mapSuccess, mapError);
        };
        
        var getMaps = function()
        {
            return mapItems;
        }
    
        var mapSuccess = function(data, jsonStatus)
        {
            status = jsonStatus;
            if (status!== uob.json.JsonStatus.LIVE){
        		uob.log.addCacheMessage('Maps: Data is from cache');       
         	}
            setMapData(data);
            initialisedFunction();
        };
        
        var mapError = function(jsonStatus)
        {
            uob.log.addErrorMessage('No maps data available.');
            status = jsonStatus;
            initialisedFunction();
        };
            
        var setMapData = function(mapData)
        {
                
            for (var i in mapData) {
                var mapItem = mapData[i];
                mapItem.getLatLngBounds = function(){
                     return uob.google.getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
                }
            }
            
            mapItems = mapData;
            
        }  

        initialise();
        
        //Public functions
        return {
            getMaps: getMaps,
            getStatus: getStatus,
            hasData: hasData
        };
              
    };
    
})(window, jQuery);