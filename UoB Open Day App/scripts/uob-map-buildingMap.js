(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.buildingMap = function(googleMapWrapper, buildingsServiceUrl, buildingServiceLocalFile) {
        
        //Private variables:
        var DEFAULT_OPACITY = .5;
        var SELECTED_OPACITY = .7;
        var UNSELECTED_OPACITY = .2;
        
        var _self = this;
        var _googleMapWrapper = googleMapWrapper;
        var _googleMap = googleMapWrapper.getGoogleMap();
        var _buildingsServiceUrl = buildingsServiceUrl;
        var _buildingServiceLocalFile = buildingServiceLocalFile;
        
        var _showBuildingBuildingId= null;
        var _buildingRequestInProgress =  false;
        var _clickedBuildings = [];        
        
        var _buildings = null;
        
        //Private functions
        
        var _setBuildings =  function(data)
        {
            if (!_buildings){
                _buildings = data;
            }
            _buildingRequestInProgress = false;
            //Get the building to show if there is one:
            var buildingId = _showBuildingBuildingId;
            
            _showBuildingBuildingId = null;
            _self.showBuildings(buildingId);

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
        
        var _restoreBuildingOpacity = function(opacity)
        {
            
            if (!opacity)
            {
				opacity = DEFAULT_OPACITY;
            }
            
            for (var i = 0; i <_buildings.length; ++i) {
            
                var building = _buildings[i];
                building.googlePolygon.setOptions({fillOpacity:opacity});
            }
		}
        
        var _setupBuildingClick = function(building)
        {

            google.maps.event.addListener(building.googlePolygon, 'click', function (event) {
            
                //Is this building already selected
                
                //If there are already 2 selected items then clear them
                if (_clickedBuildings.length>1){
                    _restoreBuildingOpacity();
                    _clickedBuildings = [];
                }
                
                //Show the selected building:
				building.googlePolygon.setOptions({fillOpacity:SELECTED_OPACITY});
                
                
                _clickedBuildings.push(building);
                
                if (_clickedBuildings.length===1)
                {
                    //Let's wipe out any existing tracking and take over.
                    _googleMapWrapper.trackLatLng(null);
                    message = "'" +  _clickedBuildings[0].BuildingName + "'";
                    _googleMapWrapper.setMapMessage(message);
                }
                
                if (_clickedBuildings.length>1)
                {
                    var building1Center = uob.google.getPolygonCenter(_clickedBuildings[0].googlePolygon);
                    var building2Center = uob.google.getPolygonCenter(_clickedBuildings[1].googlePolygon);
                    var minutesToReach = Math.round(uob.google.getDistanceBetweenTwoLatLngsInKm(building1Center, building2Center)/.060);
                                       
                    var distanceDescription= minutesToReach + " minutes";
                	if (minutesToReach===1){
                    	distanceDescription = minutesToReach + " minute";
                	}
                    
                    var message = "'" +  _clickedBuildings[0].BuildingName + "' to '" + _clickedBuildings[1].BuildingName + "': " + distanceDescription;
                                    
                    //Let's wipe out any existing tracking and take over.
                    _googleMapWrapper.trackLatLng(null);
                    _googleMapWrapper.setMapMessage(message);
                    
                }
                
            });
        }
                
        this.showBuildings = function(buildingId){
            
            var that = this;
            
            if (buildingId)
            {
                buildingId = parseInt(buildingId);
            }
            
            if (!_buildings)
            {
                _showBuildingBuildingId = buildingId;
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
            for (var i = 0; i <_buildings.length; ++i) {

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
                    _setupBuildingClick(building);
                }
                
                if (typeof building.googleMapLabels === "undefined"){
                    
                    var center = uob.google.getPolygonCenter(building.googlePolygon);
                    var labelText = building.BuildingName;
                    building.googleMapLabels = uob.google.getMapLabels(labelText, center);
                }
                
                if (buildingId){
                   
                   //If a specified building is being asked for then make it darker to stand out
                   if (buildingId===building.ContentId){
                       building.googlePolygon.setOptions({fillOpacity:SELECTED_OPACITY});  
                    }
                    else{
                        building.googlePolygon.setOptions({fillOpacity:UNSELECTED_OPACITY});
                    }
                }
                else
                {
                    //If we're showing all buildings leave them with a middling level of opacity
                    building.googlePolygon.setOptions({fillOpacity:DEFAULT_OPACITY});
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
                    
                    //Let the google map wrapper know to track the building:
                    _googleMapWrapper.trackLatLng(buildingCenter);
                    
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
        };

        this.getBuildingCenterLatLng =  function(buildingId)
        {
            if (_buildings)
            {
                console.log("Getting centre for building Id: " + buildingId);
                for (var i = 0; i <_buildings.length; ++i)  {
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