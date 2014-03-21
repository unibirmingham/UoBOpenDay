(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.buildingAndFacilitiesMap = function(googleMapWrapper) {
        
        //Private variables:
        var DEFAULT_OPACITY = .5;
        var SELECTED_OPACITY = .7;
        var UNSELECTED_OPACITY = .2;
        
        var _googleMapWrapper = googleMapWrapper;
        var _googleMap = googleMapWrapper.getGoogleMap();
        
        var _showBuildingBuildingId= null;
        var _requestsInProgress =  [];
        var _clickedBuildings = [];        
        
        var _buildings = [];
        var _allBuildings = [];
        
        var _facilities = [];
        var _allFacilities = [];
        
        //Private functions
        var _showAllBuildings = function(buildingId)
        {
            console.log("Showing all buildings highlighting building Id: " + buildingId);
            for (var i in _allBuildings) {

                var building = _allBuildings[i];
                
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
        
        var _setBuildings =  function(data, buildingsServiceUrl)
        {
            if (_buildings.indexOf(buildingsServiceUrl)===-1)
            {
                //We don't already have these buildings so create them from the data, 
                //but reuse any existing versions of the buildings so we don't end up with more than one of the same building on the map
                var newBuildings = [];
                for (var i = 0; i <data.length; ++i)
                {
                    var newBuilding = data[i];
                    var existingBuilding = _allBuildings[newBuilding.ContentId];
                    if (existingBuilding){
                        newBuilding = existingBuilding;
                    }
                    else{
                        _allBuildings[newBuilding.ContentId] = newBuilding;
                    }
                    newBuildings.push(newBuilding);
                }
                
                _buildings[buildingsServiceUrl] = newBuildings;
            }
            
            _removeRequestInProgress(this.buildingsServiceUrl);
            
            //Get the building to show if there is one:
            var buildingId = _showBuildingBuildingId;
            _showBuildingBuildingId = null;
            
            //Now show the buildings:
            _showAllBuildings(buildingId);

        };
        
        var _setFacilityGoogleMarker = function (facility) {
           
            if (typeof facility.googleMarker === "undefined") {
                
                var googleLatLng = new google.maps.LatLng(facility.CoordinatesArray[0], facility.CoordinatesArray[1]);
                
                facility.googleLatLng = googleLatLng;
                
                var icon = facility.icon;
                if (!icon){
                    icon = "";
                }
                
                var googleMarker = new google.maps.Marker({
                    setZIndex: 1000,
                    position: facility.googleLatLng,
                    map: _googleMap,
                    icon: icon,
                    title: facility.FacilityName
                });

                facility.googleMarker = googleMarker;
            }

        };
        
        var _showAllFacilities = function()
        {
            console.log("Showing all facilities");
            for (var i in _allFacilities) {

                var facility = _allFacilities[i];
                
                _setFacilityGoogleMarker(facility);
                
            }
        };
        
        var _setFacilities =  function(data, facilitiesServiceUrl, icon)
        {
            if (_facilities.indexOf(facilitiesServiceUrl)===-1)
            {
                //We don't already have these buildings so create them from the data, 
                //but reuse any existing versions of the buildings so we don't end up with more than one of the same building on the map
                var newFacilities = [];
                for (var i = 0; i <data.length; ++i)
                {
                    var newFacility = data[i];
                    var existingFacility = _allFacilities[newFacility.ContentId];
                    if (existingFacility){
                        newFacility = existingFacility;
                    }
                    else{
                        newFacility.icon = icon;
                        _allFacilities[newFacility.ContentId] = newFacility;
                    }
                    newFacilities.push(newFacility);
                }
                
                _facilities[facilitiesServiceUrl] = newFacilities;
            }
            
            _removeRequestInProgress(this.facilitiesServiceUrl);
            
            //Now show the facilities:
            _showAllFacilities();

        };
        
        var _getBuildingsSuccess = function(data)
        {
            _setBuildings(data, this.buildingsServiceUrl);
        };
        
        var _getBuildingsCacheSuccess = function(data)
        {
            uob.log.addCacheMessage('Building data: Retrieved from local cache for ' + this.buildingsServiceUrl );
            _setBuildings(data, this.buildingsServiceUrl);            
        };
        
        var _getBuildingsError = function()
        {
            uob.log.addErrorMessage('Facilities data: Failed to retrieve data for ' + + this.buildingsServiceUrl);
        };

        var _getFacilitiesSuccess = function(data)
        {
            _setFacilities(data, this.facilitiesServiceUrl, this.icon);
        };
        
        var _getFacilitiesCacheSuccess = function(data)
        {
            uob.log.addCacheMessage('Facilities data: Retrieved from local cache for ' + this.facilitiesServiceUrl );
            _setFacilities(data, this.buildingsServiceUrl, this.icon);            
        };
        
        var _getFacilitiesError = function()
        {
            uob.log.addErrorMessage('Facilities data: Failed to retrieve data for ' + + this.facilitiesServiceUrl);
        };
        
        var _isRequestInProgress = function(requestUrl){
            
            var requestUrlIndex = _requestsInProgress.indexOf(requestUrl);
            return (requestUrlIndex>-1);
        }
        var _removeRequestInProgress = function(requestUrl)
        {
            var requestUrlIndex = _requestsInProgress.indexOf(requestUrl);
            if (requestUrlIndex>=0){
                
                _requestsInProgress = _requestsInProgress.splice(requestUrlIndex, 1);
            }
        }
        
        var _addRequestInProgress = function(requestUrl)
        {
            _requestsInProgress.push(requestUrl);
        }
        
        var _restoreAllBuildingOpacity = function(opacity)
        {
            
            if (!opacity)
            {
				opacity = DEFAULT_OPACITY;
            }
            
            for (var i in _allBuildings) {
            
                var building = _allBuildings[i];
                building.googlePolygon.setOptions({fillOpacity:opacity});
            }
		}
        
        var _setupBuildingClick = function(building)
        {

            google.maps.event.addListener(building.googlePolygon, 'click', function (event) {
            
                //Is this building already selected
                
                //If there are already 2 selected items or no selected items then reset the opacity.
                if (_clickedBuildings.length!==1){
                    _restoreAllBuildingOpacity();
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
        
        
        
        this.showBuildings = function(buildingsServiceUrl, buildingsServiceLocalFile, buildingId){
            
            
            if (buildingId)
            {
                buildingId = parseInt(buildingId);
            }
            
            if (!_buildings[buildingsServiceUrl]) {
                
                _showBuildingBuildingId = buildingId;
                
                if (!_isRequestInProgress(buildingsServiceUrl)) {
                    var requestDetails = {
                        buildingsServiceUrl: buildingsServiceUrl,
                        buildingsServiceLocalFile: buildingsServiceLocalFile
                    };

                    _addRequestInProgress(buildingsServiceUrl);
                    uob.json.getJSON ("Map Buildings", buildingsServiceUrl, buildingsServiceLocalFile, _getBuildingsSuccess.bind(requestDetails), _getBuildingsCacheSuccess.bind(requestDetails), _getBuildingsError.bind(requestDetails));
                }
                else {
                    console.log("Building request in progress: Not re-requesting JSON data.");
                }
                return;
            }
            
            _showAllBuildings(buildingId);
            
        };
        
        this.showFacilities = function(facilitiesServiceUrl, facilitiesServiceLocalFile, icon){
            
            if (!_facilities[facilitiesServiceUrl]) {
                
                if (!_isRequestInProgress(facilitiesServiceUrl)) {
                    var requestDetails = {
                        facilitiesServiceUrl: facilitiesServiceUrl,
                        facilitiesServiceLocalFile: facilitiesServiceLocalFile,
                        icon: icon
                    };

                    _addRequestInProgress(facilitiesServiceLocalFile);
                    uob.json.getJSON ("Map Facilities", facilitiesServiceUrl, facilitiesServiceLocalFile, _getFacilitiesSuccess.bind(requestDetails), _getFacilitiesCacheSuccess.bind(requestDetails), _getFacilitiesError.bind(requestDetails));
                }
                else {
                    console.log("Building request in progress: Not re-requesting JSON data.");
                }
                return;
            }
            
            _showAllFacilities();
                        
        }
        
    }

}
)(window, jQuery);