(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.BuildingAndFacilitiesMap = function(googleMapWrapper) {
        
        //Private variables:
        var buildingOpacity = {
        	DEFAULT: .3,
        	SELECTED: .8,
        	UNSELECTED: .1
        }

        var selectedBuildingColour = '#EF549F';
        
        var googleMapWrapper = googleMapWrapper;
        var googleMap = googleMapWrapper.getGoogleMap();
        
        var highlightBuildingId= null;
        
        var requestsInProgress =  [];
        var clickedBuildings = [];        
        
        var buildings = [];
        var allBuildings = [];
        
        var facilities = [];
        var facilitiesVisibility = [];
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
            
            if (!highlightBuildingId){
                // Remove any previous settings for focussing on a building.
                googleMapWrapper.setLatLngBoundsToFocusOnAndTrack(null);
            }
            
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
                //If a specified building is being asked for then make it darker and an Open Day Colour to stand out
                if (building.ContentId===highlightBuildingId){
                   building.googlePolygon.setOptions({fillOpacity:buildingOpacity.SELECTED,
                   									strokeColor: selectedBuildingColour,
                   									fillColor: selectedBuildingColour
                   									});
                } else {
                    building.googlePolygon.setOptions({fillOpacity:buildingOpacity.UNSELECTED,
                    									strokeColor: building.Colour,
                   									fillColor: building.Colour								
                    								});
                }
            } else {
                //If we're showing all buildings leave them with a middling level of opacity
                building.googlePolygon.setOptions({fillOpacity:buildingOpacity.DEFAULT,
                    									strokeColor: building.Colour,
                   									 fillColor: building.Colour								
                    								});
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
            
            console.log("Setting center of map to focus on " + building.BuildingName);

            //Now work out what the map should focus on and track
            var buildingLatLngBounds = uob.google.getPolygonLatLngBounds(building.googlePolygon);
            var minimumZoom = null;
            if (building.googleMapLabels && googleMap.getZoom()<building.googleMapLabels[0].minZoom){
                //if the zoom doesn't allow the map labels to be seen then change it to make them visible.
                minimumZoom = building.googleMapLabels[0].minZoom;
            }
            
            googleMapWrapper.setLatLngBoundsToFocusOnAndTrack( "'" + building.BuildingName + "'",buildingLatLngBounds, minimumZoom);
            
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
        
        
        var setupFacilityGoogleMarkerVisibility = function (facility){

            var facilitiesServiceUrl;
            var facilitiesForServiceUrl;
            var isFacilityInFacilitiesGroup;
            var showFacility;
            
            if (!facility.googleMarker){
                console.log("No google marker for facility " + facility.Title);
                return;
            }
            
            // To appear, the facility must be in at least one facility group which is visible.
            showFacility = false;
            
            for(facilitiesServiceUrl in facilities)
            {
                showCurrentFacilities = getFacilitiesVisibility(facilitiesServiceUrl);
                
                //THis is a visible facility group, so if the facility is in this, it's visible.
                if (showCurrentFacilities)
                {
                    facilitiesForServiceUrl = facilities[facilitiesServiceUrl];
                    isFacilityInFacilitiesGroup = $j.grep(facilitiesForServiceUrl, function(facilityFromFacilityGroup){return facilityFromFacilityGroup.ContentId===facility.ContentId;});
                    
                    if (isFacilityInFacilitiesGroup){
                        showFacility=true;
                        break;
                    }
                }
            }
            
            if (!showFacility)
            {
                facility.googleMarker.setMap(null);
            }
            else{
                facility.googleMarker.setMap(googleMap);
            }
            
        };
        
        var showAllFacilities = function()
        {
            
            console.log("Showing all facilities");
            for (var i in allFacilities) {

                var facility = allFacilities[i];
                
                setupFacilityGoogleMarker(facility);
                setupFacilityGoogleMarkerVisibility(facility);
            }
        };
        
        var getFacilitiesVisibility = function(facilitiesServiceUrl) {
            var visibility = facilitiesVisibility[facilitiesServiceUrl];
            
            if (typeof visibility === 'undefined'){
                //default to true
                return true;
            }
            return visibility;
        };
        
        var setFacilitiesVisibility = function (facilitiesServiceUrl, visibility) {
            facilitiesVisibility[facilitiesServiceUrl] = visibility;
            showAllFacilities();
        }
        
        var showFacilities = function (facilitiesServiceUrl) {
            setFacilitiesVisibility(facilitiesServiceUrl, true);
        };
        
        var hideFacilities = function (facilitiesServiceUrl) {
            setFacilitiesVisibility(facilitiesServiceUrl, false);    
        };
       
        var setupFacilityGoogleMarker = function (facility) {

            if (typeof facility.googleMarker === "undefined") {
                var googleLatLng = new google.maps.LatLng(facility.CoordinatesArray[0], facility.CoordinatesArray[1]);
                
                facility.googleLatLng = googleLatLng;

                //Look for an existing marker for the same building facility with the same icon:
                for (var i in allFacilities)
                {
                    var existingFacility = allFacilities[i];
                    if (existingFacility.googleMarker && existingFacility.BuildingId === facility.BuildingId
                    	&& facility.icon === existingFacility.icon){
                        facility.googleMarker = existingFacility.googleMarker;
                        var currentTitle = facility.googleMarker.getTitle();
                        
                        if (currentTitle && currentTitle.length > 0){
                            currentTitle = currentTitle + ", ";
                        }
                        currentTitle = currentTitle + facility.FacilityName;
                        facility.googleMarker.setTitle(currentTitle);
                        break;
                    }
                }
                
                //We didn't find an existing marker so create a new one:
                if (!facility.googleMarker)
                {
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
                    
                    googleMarker.facilities = [];
                    
                    facility.googleMarker = googleMarker;
                    google.maps.event.addListener(googleMarker, 'click', function (event) {
                		googleMapWrapper.setDestination(this.getPosition(), "'" + this.getTitle() + "'");
                    });
                }
                
                facility.googleMarker.facilities.push(facility);
                
                
            }

        };
        
        var setFacilities =  function(data, facilitiesServiceUrl, icon)
        {
            if (facilities.indexOf(facilitiesServiceUrl)===-1)
            {
                //We don't already have these buildings so create them from the data, 
                //but reuse any existing versions of the facilities so we don't end up with more than one of the same facility on the map
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
            uob.log.addLogError('Facilities data: Failed to retrieve data for ' + + this.facilitiesServiceUrl);
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
        
        var restoreAllBuildingColourAndOpacity = function(opacity)
        {
            
            if (!opacity)
            {
				opacity = buildingOpacity.DEFAULT;
            }
            
            for (var i in allBuildings) {
            
                var building = allBuildings[i];
                	
                building.googlePolygon.setOptions({fillOpacity:opacity,
                    									strokeColor: building.Colour,
                   									 fillColor: building.Colour});
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
                    restoreAllBuildingColourAndOpacity();
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
                    googleMapWrapper.setDestination(uob.google.getPolygonCenter(clickedBuildings[0].googlePolygon), message);
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
            showFacilities: showFacilities,
            hideFacilities: hideFacilities,
            getFacilitiesVisibility: getFacilitiesVisibility,
            setHighlightBuilding: setHighlightBuilding,
            clearHighlightBuilding: clearHighlightBuilding
        }
        
    }

}
)(window, jQuery);