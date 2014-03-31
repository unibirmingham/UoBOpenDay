(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.BuildingAndFacilitiesMap = function(googleMapWrapper) {
        
        //Private variables:
        var buildingOpacity = {
        	DEFAULT: .5,
        	SELECTED: .7,
        	UNSELECTED: .2
        }

        var googleMapWrapper = googleMapWrapper;
        var googleMap = googleMapWrapper.getGoogleMap();
        
        var highlightBuildingId= null;
        
        var requestsInProgress =  [];
        var clickedBuildings = [];        
        
        var buildings = [];
        var allBuildings = [];
        
        var facilities = [];
        var allFacilities = [];
        
        //Private functions
        var showAllBuildingsAndFacilities = function()
        {
            showAllBuildings();
            showAllFacilities();
        }
        
        var showAllBuildings = function()
        {
            console.log("Showing all buildings. Current hightlight id: " + highlightBuildingId);
            
            for (var i in allBuildings) {

                var building = allBuildings[i];
               
                setupBuildingGooglePolygon(building);
               
                setupBuildingMapLabels(building);
                
                if (building.ContentId===highlightBuildingId)
                {   
                    focusMapOnBuilding(building);
                }
            }
        };
        
        var setupBuildingGooglePolygon = function(building) {
            if (typeof building.googlePolygon === "undefined") {
                
                var polygonCoordinates = building.PolygonCoordinatesAsArrayList;

                var googleBuildingCoords = [];

                for (var pci in polygonCoordinates) {
                    var coords = polygonCoordinates[pci];
                    googleBuildingCoords.push(new google.maps.LatLng(coords[0], coords[1]));
                }
                building.googleBuildingCoords = googleBuildingCoords;
                building.googlePolygon = uob.google.getPolygon(googleBuildingCoords, building.Colour);
                setupBuildingClickEvent(building);
            }
            
            building.googlePolygon.setMap(googleMap);
            
            if (highlightBuildingId){
                //If a specified building is being asked for then make it darker to stand out
                if (building.ContentId===highlightBuildingId){
                   building.googlePolygon.setOptions({fillOpacity:buildingOpacity.SELECTED});  
                } else {
                    building.googlePolygon.setOptions({fillOpacity:buildingOpacity.UNSELECTED});
                }
            } else {
                //If we're showing all buildings leave them with a middling level of opacity
                building.googlePolygon.setOptions({fillOpacity:buildingOpacity.DEFAULT});
            }
            
        }
        
        var setupBuildingMapLabels = function(building) {
            if (typeof building.googleMapLabels === "undefined"){
                
                var center = uob.google.getPolygonCenter(building.googlePolygon);
                var labelText = building.BuildingName;
                building.googleMapLabels = uob.google.getMapLabels(labelText, center);
            }
            
            for (var iml in building.googleMapLabels){
                var mapLabel = building.googleMapLabels[iml];
                mapLabel.setMap(googleMap);
            }
        };
        
        var focusMapOnBuilding = function(building){
            
            console.log("Setting center of map to center of " + building.BuildingName);

            var buildingCenter = uob.google.getPolygonCenter(building.googlePolygon);                        
            if (building.googleMapLabels && googleMap.getZoom()<building.googleMapLabels[0].minZoom){
                //if the zoom doesn't allow the map labels to be seen then change it to make them visible.
                googleMap.setZoom(building.googleMapLabels[0].minZoom);
            }
            googleMap.setCenter(buildingCenter);
            
            //Put the name of the building on the map
            googleMapWrapper.setMapMessage(building.BuildingName);
            
            //Let the google map wrapper know to track the building:
            googleMapWrapper.setDestination(buildingCenter, "'" + building.BuildingName + "'");
            
            //If we've got campus map data, see if we're on campus and if so, show us and the building in relation.
            navigator.geolocation.getCurrentPosition(
                function(position){
                    if (highlightBuildingId!== building.ContentId){
                        console.log("highlight building id has changed so not centering map");
                        return;
                    }
                    var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                    var distanceFromBuildingToPosition = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, buildingCenter);
                    
                    var trackingDistance = googleMapWrapper.getTrackingDistanceInKm();
                    
                    if (distanceFromBuildingToPosition <trackingDistance){
                        console.log("Showing person on map as " + trackingDistance + "km away");
                        var bounds =uob.google.getPolygonLatLngBounds(building.googlePolygon);
                        bounds.extend(positionLatLng);
                        googleMap.fitBounds(bounds);
                    }
                    else{
                        console.log("Not showing person on map as " + distanceFromBuildingToPosition + "km away");
                    }
                }, function(){
                    console.log("Error getting current position");
                });
        }
        
        var setBuildings =  function(data, buildingsServiceUrl)
        {
            if (buildings.indexOf(buildingsServiceUrl)===-1)
            {
                //We don't already have these buildings so create them from the data, 
                //but reuse any existing versions of the buildings so we don't end up with more than one of the same building on the map
                var newBuildings = [];
                for (var i = 0; i <data.length; ++i)
                {
                    var newBuilding = data[i];
                    var existingBuilding = allBuildings[newBuilding.ContentId];
                    if (existingBuilding){
                        newBuilding = existingBuilding;
                    }
                    else{
                        allBuildings[newBuilding.ContentId] = newBuilding;
                    }
                    newBuildings.push(newBuilding);
                }
                
                buildings[buildingsServiceUrl] = newBuildings;
            }
            
            removeRequestInProgress(buildingsServiceUrl);
            
            //Now show the buildings and facilities:
            showAllBuildingsAndFacilities();

        };
        
        var setupFacilityGoogleMarker = function (facility) {
           
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
                    map: googleMap,
                    icon: icon,
                    title: facility.FacilityName
                });

                facility.googleMarker = googleMarker;
                
                google.maps.event.addListener(googleMarker, 'click', function (event) {
                    googleMapWrapper.setMapMessage(facility.FacilityName);
            		googleMapWrapper.setDestination(facility.googleLatLng, "'" + facility.FacilityName + "'");
                });
            }

        };
        
        var showAllFacilities = function()
        {
            console.log("Showing all facilities");
            for (var i in allFacilities) {

                var facility = allFacilities[i];
                
                setupFacilityGoogleMarker(facility);
                
            }
        };
        
        var setFacilities =  function(data, facilitiesServiceUrl, icon)
        {
            if (facilities.indexOf(facilitiesServiceUrl)===-1)
            {
                //We don't already have these buildings so create them from the data, 
                //but reuse any existing versions of the buildings so we don't end up with more than one of the same building on the map
                var newFacilities = [];
                for (var i = 0; i <data.length; ++i)
                {
                    var newFacility = data[i];
                    var existingFacility = allFacilities[newFacility.ContentId];
                    if (existingFacility){
                        newFacility = existingFacility;
                    }
                    else{
                        newFacility.icon = icon;
                        allFacilities[newFacility.ContentId] = newFacility;
                    }
                    newFacilities.push(newFacility);
                }
                
                facilities[facilitiesServiceUrl] = newFacilities;
            }
            
            removeRequestInProgress(facilitiesServiceUrl);
            
            //Now show the facilities and buildings
            showAllBuildingsAndFacilities();

        };
        
        var getBuildingsSuccess = function(data, jsonStatus)
        {
             if (jsonStatus!== uob.json.JsonStatus.LIVE){
        		uob.log.addLogWarning('Building data: Retrieved from local cache for ' + this.buildingsServiceUrl );
         	}
             setBuildings(data, this.buildingsServiceUrl);
        };
                
        var getBuildingsError = function()
        {
            uob.log.addLogError('Facilities data: Failed to retrieve data for ' + + this.buildingsServiceUrl);
        };

        var getFacilitiesSuccess = function(data, jsonStatus)
        {
            if (jsonStatus!== uob.json.JsonStatus.LIVE){
                uob.log.addLogWarning('Facilities data: Retrieved from local cache for ' + this.facilitiesServiceUrl );
            }
            
            setFacilities(data, this.facilitiesServiceUrl, this.icon);
        };
        
        var getFacilitiesError = function()
        {
            uob.log.addErrorMessage('Facilities data: Failed to retrieve data for ' + + this.facilitiesServiceUrl);
        };
        
        var isRequestInProgress = function(requestUrl){
            
            //if no request url, just returns whether any requests are in progress:
            if (!requestUrl)
            {
				return (requestsInProgress.length>0);
            }
            
            var requestUrlIndex = requestsInProgress.indexOf(requestUrl);
            return (requestUrlIndex>-1);
        }
        var removeRequestInProgress = function(requestUrl)
        {
            var requestUrlIndex = requestsInProgress.indexOf(requestUrl);
            if (requestUrlIndex>=0){
                
                requestsInProgress.splice(requestUrlIndex, 1);
            }
        }
        
        var addRequestInProgress = function(requestUrl)
        {
            requestsInProgress.push(requestUrl);
        }
        
        var restoreAllBuildingOpacity = function(opacity)
        {
            
            if (!opacity)
            {
				opacity = buildingOpacity.DEFAULT;
            }
            
            for (var i in allBuildings) {
            
                var building = allBuildings[i];
                building.googlePolygon.setOptions({fillOpacity:opacity});
            }
		}
        
        var setupBuildingClickEvent = function(building)
        {

            google.maps.event.addListener(building.googlePolygon, 'click', function (event) {
            
                //Is this building already selected
                
                
                if (clickedBuildings.length===1){
                 	//If there's one clicked building and it's this building, just ignore:
                    if (clickedBuildings[0].ContentId === building.ContentId){
                        return;
                    }
                }else{
                    //If there are already 2 selected items or no selected items then reset the opacity.
                    restoreAllBuildingOpacity();
                    clickedBuildings = [];
                }
                
                //Show the selected building:
				building.googlePolygon.setOptions({fillOpacity:buildingOpacity.SELECTED});
                
                clickedBuildings.push(building);
                
                if (clickedBuildings.length===1)
                {
                    //Let's wipe out any existing tracking and take over.
                    googleMapWrapper.clearDestination();
                    message = "'" +  clickedBuildings[0].BuildingName + "'";
                    googleMapWrapper.setMapMessage(message);
                }
                
                if (clickedBuildings.length>1)
                {
                    var building1Center = uob.google.getPolygonCenter(clickedBuildings[0].googlePolygon);
                    var building2Center = uob.google.getPolygonCenter(clickedBuildings[1].googlePolygon);
                    var minutesToReach = Math.round(uob.google.getDistanceBetweenTwoLatLngsInKm(building1Center, building2Center)/.060);
                                       
                    var distanceDescription= minutesToReach + " minutes";
                	if (minutesToReach===1){
                    	distanceDescription = minutesToReach + " minute";
                	}
                    
                    var message = "'" +  clickedBuildings[0].BuildingName + "' to '" + clickedBuildings[1].BuildingName + "': " + distanceDescription;
                                    
                    //Let's wipe out any existing tracking and take over.
                    googleMapWrapper.clearDestination();
                    googleMapWrapper.setMapMessage(message);
                    
                }
                
            });
        };
        
        
        var addBuildings = function(buildingsServiceUrl, buildingsServiceLocalFile){
            
            
            if (!buildings[buildingsServiceUrl]) {
                
                if (!isRequestInProgress(buildingsServiceUrl)) {
                    var requestDetails = {
                        buildingsServiceUrl: buildingsServiceUrl,
                        buildingsServiceLocalFile: buildingsServiceLocalFile
                    };

                    addRequestInProgress(buildingsServiceUrl);
                    uob.json.getJSON ("Map Buildings", buildingsServiceUrl, buildingsServiceLocalFile, getBuildingsSuccess.bind(requestDetails),  getBuildingsError.bind(requestDetails));
                }
                else {
                    console.log("Building request in progress: Not re-requesting JSON data.");
                }
                return;
            }
            
            showAllBuildingsAndFacilities();
            
        };
        
        var addFacilities = function(facilitiesServiceUrl, facilitiesServiceLocalFile, icon){
            
            if (!facilities[facilitiesServiceUrl]) {
                
                if (!isRequestInProgress(facilitiesServiceUrl)) {
                    var requestDetails = {
                        facilitiesServiceUrl: facilitiesServiceUrl,
                        facilitiesServiceLocalFile: facilitiesServiceLocalFile,
                        icon: icon
                    };

                    addRequestInProgress(facilitiesServiceUrl);
                    uob.json.getJSON ("Map Facilities", facilitiesServiceUrl, facilitiesServiceLocalFile, getFacilitiesSuccess.bind(requestDetails), getFacilitiesError.bind(requestDetails));
                }
                else {
                    console.log("Building request in progress: Not re-requesting JSON data.");
                }
                return;
            }
            
            showAllBuildingsAndFacilities();
                        
        }
        
        var clearHighlightBuilding = function(){
            setHighlightBuilding(null);
        }
        
        var setHighlightBuilding = function(buildingId) {
            
            if (buildingId){
                buildingId = parseInt(buildingId);
            }
            
            if (!buildingId) {
                //If we're not highlighting an individual building, then let's centre the map and remove any tracking:
                googleMapWrapper.clearDestination();
                googleMapWrapper.centerOnMapData();
                highlightBuildingId = null;
            } else {
                console.log("Highlighting Building: " + buildingId);
            	highlightBuildingId = buildingId;
            }
            
            if (!isRequestInProgress()) {
                //Any request in progress will update the buildings and facilities, so if there aren't any we need to do that directly:
                showAllBuildingsAndFacilities();
            }
            
        };

        return{
            addBuildings: addBuildings,
            addFacilities: addFacilities,
            setHighlightBuilding: setHighlightBuilding,
            clearHighlightBuilding: clearHighlightBuilding
        }
        
    }

}
)(window, jQuery);