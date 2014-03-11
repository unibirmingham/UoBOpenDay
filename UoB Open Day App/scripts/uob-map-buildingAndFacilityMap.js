(function (global, $j) {
    
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.google = uob.google || {};
    uob.map = uob.map || {};
    
    uob.map.buildingAndFacilityMap = {
        
        buildings:null,
        campusMapData: null,
        _googleMap: null,
        _showBuildingBuildingId: null,
        _showBuildingSuccessFunction: null,
        _buildingRequestInProgress: false,
        
        
        _setBuildings: function(data)
        {
            var that = this
            if (!that.buildings){
                that.buildings = data;
            }
            that._buildingRequestInProgress = false;
            //Get the building to show if there is one:
            var buildingId = that._showBuildingBuildingId;
            var successFunction = that._showBuildingSuccessFunction;
            
            that._showBuildingBuildingId = null;
            that._showBuildingSuccessFunction= null;
            that.showBuildings(null, null, buildingId, successFunction);

        },
        
        _getBuildingsSuccess: function(data)
        {
            var that = this;
            that._setBuildings(data);
        },
        
        _getBuildingsCacheSuccess: function(data)
        {
            var that = this;
            uob.log.addCacheMessage('Events building data: From local cache');
            that._setBuildings(data);            
        },
        _getBuildingsError: function(data)
        {
            uob.log.addErrorMessage('Events building data: Failed to retrieve data');
        },
        
        setGoogleMap: function(googleMap)
        {
            this._googleMap = googleMap;    
        },
        
        getGoogleMap: function()
        {
            return this._googleMap;
        },
        
        showBuildings: function(buildingsServiceUrl, buildingServiceLocalFile, buildingId, successFunction){
            
            var that = this;
            
            if (buildingId)
            {
                buildingId = parseInt(buildingId);
            }
            
            if (!that.buildings)
            {
                that._showBuildingBuildingId = buildingId;
                that._showBuildingSuccessFunction = successFunction;
                if (!that._buildingRequestInProgress)
                {
                    that._buildingRequestInProgress = true;
                    uob.json.getJSON ("Buildings", buildingsServiceUrl, buildingServiceLocalFile, that._getBuildingsSuccess.bind(that), that._getBuildingsCacheSuccess.bind(that), that._getBuildingsError.bind(that));
                }
                else{
                    console.log("Building request in progress.");
                }
                return;
            }
            
            console.log("Showing building data with building Id: " + buildingId);
            for (var i in that.buildings) {

                var building = that.buildings[i];
                
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
                
                var googleMapForBuilding = app.campusMapService.campusGoogleMap;
                
                if (buildingId){
                   if (buildingId===building.ContentId){
                       
                        //If a specified building is being asked for then hide other buildings
                        building.googlePolygon.setOptions({fillOpacity:.7});  
                        
                    }
                    else{
                            //If a specified building is being asked for then hide other buildings
                            building.googlePolygon.setOptions({fillOpacity:.2});  
                        }
                }
                else
                {
                     building.googlePolygon.setOptions({fillOpacity:.5});
                }
                
                if (buildingId === building.ContentId)
                {   
                   
                    console.log("Setting center of map to center of " + building.BuildingName);
                    var selectedBuilding = building;
                    var buildingCenter = uob.google.getPolygonCenter(building.googlePolygon);                        
                    if (building.googleMapLabels){
                        //Set the zoom to enable the labels to be seen:
                        googleMapForBuilding.setZoom(building.googleMapLabels[0].minZoom);
                    }
                    googleMapForBuilding.setCenter(buildingCenter);
                    
                    //If we've got campus map data, see if we're on campus and if so show us and the building in relation.
                    navigator.geolocation.getCurrentPosition(
                                            function(position){
                                                var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                                                var distanceFromBuildingToPosition = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, buildingCenter);
                                                
                                                if (distanceFromBuildingToPosition <1.5){
                                                    console.log("Showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                    var bounds =uob.google.getPolygonLatLngBounds(selectedBuilding.googlePolygon);
                                                    bounds.extend(positionLatLng);
                                                    googleMapForBuilding.fitBounds(bounds);
                                                }
                                                else{
                                                    console.log("Not showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                }
                                            }, function(){
                                                console.log("Error getting current position");
                                            });
                    
                }
                
                building.googlePolygon.setMap(googleMapForBuilding);
                for (var iml in building.googleMapLabels){
                    var mapLabel = building.googleMapLabels[iml];
                    mapLabel.setMap(googleMapForBuilding);
                }
            }
            if (successFunction){
                successFunction(buildingId);    
            }
             
        },

        getBuildingCenterLatLng: function(buildingId)
        {
            var that = this;
            if (that.buildings)
            {
                console.log("Showing building data with building Id: " + buildingId);
                for (var i in that.buildings) {
                    var building = that.buildings[i];
                    if (building.ContentId===buildingId){
                        return uob.google.getPolygonCenter(building.googlePolygon);
                    }
                }
            
            }
        }
    }

}
)(window, jQuery);