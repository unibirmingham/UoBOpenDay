(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.buildingMap = function(googleMap, buildingsServiceUrl, buildingServiceLocalFile) {
        
        //Private variables:
        var _self = this;
        var _googleMap = googleMap;
        var _buildingsServiceUrl = buildingsServiceUrl;
        var _buildingServiceLocalFile = buildingServiceLocalFile;
        
        var _showBuildingBuildingId= null;
        var _showBuildingSuccessFunction= null;
        var _buildingRequestInProgress =  false;
        
        var _buildings = null;
        
        //Private functions
        
        var _setBuildings =  function(data)
        {
            if (!_buildings){
                _buildings = data;
            }
            _buildingRequestInProgress = false;
            //Get the building to show and successs function if there is one:
            var buildingId = _showBuildingBuildingId;
            var successFunction = _showBuildingSuccessFunction;
            
            _showBuildingBuildingId = null;
            _showBuildingSuccessFunction= null;
            _self.showBuildings(buildingId, successFunction);

        };
        
        var _getBuildingsSuccess = function(data)
        {
            _setBuildings(data);
        };
        
        var _getBuildingsCacheSuccess = function(data)
        {
            uob.log.addCacheMessage('Events building data: From local cache');
            _setBuildings(data);            
        };
        
        var _getBuildingsError = function(data)
        {
            uob.log.addErrorMessage('Events building data: Failed to retrieve data');
        };
                
        this.showBuildings = function(buildingId, successFunction){
            
            var that = this;
            
            if (buildingId)
            {
                buildingId = parseInt(buildingId);
            }
            
            if (!_buildings)
            {
                _showBuildingBuildingId = buildingId;
                _showBuildingSuccessFunction = successFunction;
                if (!_buildingRequestInProgress)
                {
                    _buildingRequestInProgress = true;
                    uob.json.getJSON ("Buildings", _buildingsServiceUrl, _buildingServiceLocalFile, _getBuildingsSuccess.bind(that), _getBuildingsCacheSuccess.bind(that), _getBuildingsError.bind(that));
                }
                else{
                    console.log("Building request in progress: Not re-requesting JSON data.");
                }
                return;
            }
            
            console.log("Showing building data with building Id: " + buildingId);
            for (i = 0; i <_buildings.length; ++i) {

                var building = _buildings[i];
                
                if (typeof building.googlePolygon === "undefined") {
                    
                    var polygonCoordinates = building.PolygonCoordinatesAsArrayList;

                    var googleBuildingCoords = [];

                    for (var pci in polygonCoordinates) {
                        var coords = polygonCoordinates[pci];
                        googleBuildingCoords.push(new google.maps.LatLng(coords[0], coords[1]));
                    }
                    building.googleBuildingCoords = googleBuildingCoords;
                    building.googlePolygon = uob.google.getPolygon(googleBuildingCoords, building.Colour);
                }
                
                if (typeof building.googleMapLabels === "undefined"){
                    
                    var center = uob.google.getPolygonCenter(building.googlePolygon);
                    var labelText = building.BuildingName;
                    building.googleMapLabels = uob.google.getMapLabels(labelText, center);
                }
                
                if (buildingId){
                   
                   //If a specified building is being asked for then make it darker to stand out
                   if (buildingId===building.ContentId){
                       building.googlePolygon.setOptions({fillOpacity:.7});  
                    }
                    else{
                        building.googlePolygon.setOptions({fillOpacity:.2});
                    }
                }
                else
                {
                    //If we're showing all buildings leave them with a middling level of opacity
                     building.googlePolygon.setOptions({fillOpacity:.5});
                }
                
                if (buildingId === building.ContentId)
                {   
                    console.log("Setting center of map to center of " + building.BuildingName);
                    var selectedBuilding = building;
                    var buildingCenter = uob.google.getPolygonCenter(building.googlePolygon);                        
                    if (building.googleMapLabels && _googleMap.getZoom()<building.googleMapLabels[0].minZoom){
                        //if the zoom doesn't allow the map labels to be seen then change it to make them visible.
                        _googleMap.setZoom(building.googleMapLabels[0].minZoom);
                    }
                    _googleMap.setCenter(buildingCenter);
                    
                    //If we've got campus map data, see if we're on campus and if so, show us and the building in relation.
                    navigator.geolocation.getCurrentPosition(
                                            function(position){
                                                var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                                                var distanceFromBuildingToPosition = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, buildingCenter);
                                                
                                                if (distanceFromBuildingToPosition <1.5){
                                                    console.log("Showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                    var bounds =uob.google.getPolygonLatLngBounds(selectedBuilding.googlePolygon);
                                                    bounds.extend(positionLatLng);
                                                    _googleMap.fitBounds(bounds);
                                                }
                                                else{
                                                    console.log("Not showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                }
                                            }, function(){
                                                console.log("Error getting current position");
                                            });
                    
                }
                
                building.googlePolygon.setMap(_googleMap);
                for (var iml in building.googleMapLabels){
                    var mapLabel = building.googleMapLabels[iml];
                    mapLabel.setMap(_googleMap);
                }
            }
            if (successFunction){
                successFunction(buildingId);    
            }
             
        };

        this.getBuildingCenterLatLng =  function(buildingId)
        {
            if (_buildings)
            {
                console.log("Getting centre for building Id: " + buildingId);
                for (i = 0; i <_buildings.length; ++i)  {
                    var building = _buildings[i];
                    if (building.ContentId===buildingId){
                        return uob.google.getPolygonCenter(building.googlePolygon);
                    }
                }
            
            }
        };
    }

}
)(window, jQuery);