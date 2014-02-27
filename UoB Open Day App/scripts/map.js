(function (global, $j) {
    
    var CampusMapViewModel,
    app = global.app = global.app || {};
    uob = global.uob = global.uob || {};
    url = uob.url = uob.url || {};
    //Initialise map data:
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        app.campusMapService.loadMapData();
    }
        
    CampusMapViewModel = kendo.data.ObservableObject.extend({
        _googleMap: null,
        _lastMarker: null,
        _isLoading: false,
        _centerToRetain: null,
        _watchId: "",
        mapData: null,
        isGoogleMapsInitialized: false,

        showLoading: function () {
            if (this._isLoading) {
                app.application.showLoading();
            }
        },

        hideLoading: function () {
            app.application.hideLoading();
        },

        setGoogleMap: function(googleMap)
        {
            this._googleMap = googleMap;
            console.log("Track center changes so that we can correct orientation changes");
            google.maps.event.addListener(this._googleMap, 'center_changed', app.campusMapService.viewModel.trackCenter.bind(this) );  
        },
        
        showMap: function(){
            
            var that = this;
            global.addEventListener('orientationchange', that.orientationchange);
            //Setup user geolocation tracking
            that.trackUser();
            that.hideLoading();
        },
        
        hideMap: function(){
            //Get rid of events which aren't needed when map is not visible.
            var that = this;
            that.untrackUser();
            global.removeEventListener('orientationchange', that.orientationchange);
            that.hideLoading();
        },
        
        orientationchange: function()
        {
            //When the orientation is changed this can lose the center of the map -- thse function keeps it and reinstates it.
            console.log("Orientation change");
            app.campusMapService.viewModel.keepCurrentCenter();
        },
        
        trackUser: function(){
            var that = this;
            if (!that._watchId){
                var geoLocationOptions = {timeout: 30000, enableHighAccuracy: true};
                that._watchId = navigator.geolocation.watchPosition(that._showPositionOnMap.bind(that), that._watchPositionError.bind(that), geoLocationOptions);
                console.log("Tracking user with watch id: " + that._watchId);
            }
            else{
                console.log("Already tracking user with watch id: " + that._watchId);
            }
        },
        untrackUser: function(){
           var that = this;
           if (that._watchId)
            {
                navigator.geolocation.clearWatch(that._watchId);
                console.log("Untracking user with watch id: " + that._watchId);
                that._watchId = "";
            }
        },
        returnToCampus: function()
        {
            var that = this;
            if (that._googleMap && that.mapData){
                that._googleMap.setZoom(15);
                that._googleMap.setCenter(that.mapData.latLngBounds().getCenter());
             }
        },
        trackCenter: function()
        {
            var that = this;
            var centerToRetain = that._centerToRetain;
            
            if (centerToRetain!==undefined && centerToRetain!==null)
            {
                var center = that._googleMap.getCenter();
                 if (!center.equals(centerToRetain)){
                     
                     var newCenter = centerToRetain;
                     that._centerToRetain = null;
                     console.log("Resetting center from " + center + " to " + newCenter);
                     that._googleMap.setCenter(newCenter);
                 }
 
            }
        },
        keepCurrentCenter: function(){
            var that= this;
            var center = that._googleMap.getCenter();
            
            that._centerToRetain = new google.maps.LatLng( center.lat(), center.lng());
            console.log("Retaining center: " + that._centerToRetain);
        },
        _showPositionOnMap: function (position) {
            var that = this;

            if (that._lastMarker !== null && that._lastMarker !== undefined) {
                that._lastMarker.setMap(null);
            }
            //Get the current position
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            console.log("Putting marker in for current position");
            that._lastMarker = new google.maps.Marker({
                map: that._googleMap,
                position: positionLatLng
            });
        },
        
        _watchPositionError: function(error){
            console.log("Error watching position. Code: " + error.code + " Message: " + error.message);
        }
    });

    app.campusMapService = {
        
        helpPointsLayer: new google.maps.KmlLayer('http://mapsengine.google.com/map/kml?mid=zVpAqNihyIqo.kUp2n30TUjHY&amp;lid=zVpAqNihyIqo.k484h8JBYbe8',{preserveViewport: true, suppressInfoWindows: true}),
        
        buildings:{},
        
        campusMapData: null,
        
        campusGoogleMap: null,
        
        loadMapData: function (){
            
            var that = this;
            console.log("Requesting map data");
            that.viewModel.showLoading();
            
            $j.getJSON(uob.url.MapsService, function (mapData) {

                    console.log("Map data retrieved");                
                    var uobMaps = mapData;
                    if (!uobMaps) {
                        app.addErrorMessage('Error initialising map: Map data not found');
                        return;
                    }
                    else{
                        console.log("Retrieved " + uobMaps.length + " maps");
                    }
                    
                    for (var i in uobMaps) {
                        //Setup the lat lng bounds on the uob maps:
                        var uobMap = uobMaps[i];
                        if (uobMap.MapName.indexOf("Edgbaston") !== -1) {
                            that.campusMapData = uobMap;
                        }
                    }
                    
                    if (that.campusMapData) {
                        that.campusMapData.latLngBounds = function(){
                             return uob.google.getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
                        }
                    }
                    else{
                        //No campus map so exit:
                        app.addErrorMessage('Error initialising map: Edgbaston Campus Map data not found');
                        return;
                    }
                
                    that.viewModel.mapData = that.campusMapData;
                    app.enableLinks("mapServiceButton");
                    that.viewModel.hideLoading();
                
                }).fail(function(jqXHR, textStatus, errorThrown) {
                        app.addErrorMessage('Error initialising map: Map data retrieval error');
                        console.log("error " + textStatus);
                        console.log("incoming Text " + jqXHR.responseText);
                    that.viewModel.hideLoading();
                }
            );
        },
        
        initialise: function () {
                        
            $j('#no-map').text('Initialising map ...');
            console.log("Map initialise");
            app.campusMapService.viewModel.showLoading();

            var mapOptions;

            if (typeof google === "undefined"){
                $j('#no-map').text('Error initialising map: Google not found');
                return;
            } 
           
            if (app.campusMapService.campusMapData === null)
            {
                $j('#no-map').text('Error initialising map: No campus map data found');
                return;     
            }
               
            console.log("Setting google map initialised");
            app.campusMapService.viewModel.set("isGoogleMapsInitialized", true);
            
            var googleMapStyling = [
                {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [
                        { visibility: "off" }
                    ]
                },
                {
                    featureType: "landscape.man_made",
                    elementType: "labels",
                    stylers: [
                      { visibility: "off" }
                    ]
                }
            ];
            
            var campusMapStyle = new google.maps.StyledMapType(googleMapStyling, { name: "Campus Map" });
            
            mapOptions = {
                zoom: 15,
                center: app.campusMapService.campusMapData.latLngBounds().getCenter(),
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM
                },
                mapTypeControl: false,
                streetViewControl: false,
                mapTypeControlOptions: {mapTypeIds: ['Campus Map']}
            };

            var newCampusGoogleMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            
            newCampusGoogleMap.mapTypes.set('Campus Map', campusMapStyle);
            newCampusGoogleMap.setMapTypeId('Campus Map');
            
            app.campusMapService.viewModel.setGoogleMap ( newCampusGoogleMap);
            app.campusMapService.campusGoogleMap = newCampusGoogleMap;
            
            app.campusMapService.showHelpPoints();
            
            app.campusMapService.viewModel.showMap();
                
        },
        
        showHelpPoints: function(){this.helpPointsLayer.setMap(app.campusMapService.campusGoogleMap);},
        
        showBuildings: function(buildingId){
            
            var that = this;
            
            if (buildingId)
            {
                buildingId = parseInt(buildingId);
            }
            
            if (app.campusMapService.buildings.length)
            {
                console.log("Showing building data with building Id: " + buildingId);
                for (var i in app.campusMapService.buildings) {

                    var building = app.campusMapService.buildings[i];
                    
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
                        
                        var singleBuildingGoogleMap = googleMapForBuilding;
                        
                        console.log("Setting center of map to center of " + building.BuildingName);
                        var buildingCenter = uob.google.getPolygonCenter(building.googlePolygon);                        
                        
                        if (building.googleMapLabels){
                            //Set the zoom to enable the labels to be seen:
                            googleMapForBuilding.setZoom(building.googleMapLabels[0].minZoom);
                        }
                        googleMapForBuilding.setCenter(buildingCenter);
                        
                        if (that.campusMapData){
                            //If we've got campus map data, see if we're on campus and if so show us and the building in relation.
                            navigator.geolocation.getCurrentPosition(
                                                    function(position){
                                                        var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                                                        var distanceFromBuildingToPosition = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, buildingCenter);
                                                        
                                                        if (distanceFromBuildingToPosition <1.5){
                                                            console.log("Showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                            uob.google.extendMapToShowPoints(singleBuildingGoogleMap, positionLatLng, buildingCenter);
                                                        }
                                                        else{
                                                            console.log("Not showing person on map as " + distanceFromBuildingToPosition + "km away");
                                                        }
                                                    }, function(){
                                                        console.log("Error getting current position");
                                                    });
                        }

                        
                    }
                    
                    building.googlePolygon.setMap(googleMapForBuilding);
                    for (var iml in building.googleMapLabels){
                        var mapLabel = building.googleMapLabels[iml];
                        mapLabel.setMap(googleMapForBuilding);
                    }
                }
                
            }
            else{
                console.log("Retrieving building data");
                $j.getJSON(uob.url.EventsService + 'buildings/?category=Open Day', function(buildingData) {

                        if (buildingData.length===0)
                        {
                            console.log("Building data is empty");
                            that._retrieveBuildingsFromLocalStorage();
                            return;
                        }
                        console.log("Setting building data");
                        app.campusMapService.buildings = buildingData;
                        //Put into the cache:
                        that._setLocalStorageBuildings(buildingData);
                        //Now call self again to show them :
                        app.campusMapService.showBuildings(buildingId);
                    }
            
            
                    ).fail(function(jqXHR, textStatus, errorThrown) {
                    
                        console.log("Failure retrieving events building data: Error " + textStatus + " incoming Text " + jqXHR.responseText);
                        that._retrieveBuildingsFromLocalStorage();
                        that.viewModel.hideLoading();
                    }
                );
            }
            

        },
        
        _setLocalStorageBuildings: function(eventBuildings){
            var stringEventBuildingData = JSON.stringify(eventBuildings);
            localStorage.setItem("uob-events-map-buildings", stringEventBuildingData);    
        },
        _retrieveBuildingsFromLocalStorage: function()
        {
            console.log("Attempting to retrieve event building data from local storage cache");
            var stringEventBuildingData = localStorage.getItem("uob-events-map-buildings");
            if (stringEventBuildingData){
                var buildingData = JSON.parse(stringEventBuildingData);
                if (buildingData.length>0){
                    app.addErrorMessage('Using local cache of events building data');
                    app.campusMapService.buildings = buildingData;
                    app.campusMapService.showBuildings();
                    return;
                }
                else{
                    console.log("Failed to retrieve local storage buildings data cache.");
                }
            }
            console.log("Attempting to load local copy of data");
            $j.getJSON('data/events-buildings.json', function(buildingData) {

                console.log("Setting building data from local copy");
                if (buildingData.length>0){
                    app.campusMapService.buildings = buildingData;
                    //Now call self again to show them :
                    app.campusMapService.showBuildings();
                }
                else {
                    app.addErrorMessage("Retrieved building data from local file but was empty.");
                    that.viewModel.hideLoading();
                }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                app.addErrorMessage("Failure retrieving events building data from local: Error " + textStatus + " incoming Text " + jqXHR.responseText);
                that.viewModel.hideLoading();
            });
            
        },
        show: function (e) {
            console.log("Map show");
            if (!app.campusMapService.viewModel.get("isGoogleMapsInitialized")) {
                return;
            }
            var buildingId = e.view.params.buildingId;
            
            app.campusMapService.showBuildings(buildingId);
            
            //Tell map that is now visible
            app.campusMapService.viewModel.showMap(buildingId);
            
        },
        
        hide: function () {
            console.log("Map hide");
            //Tell map that it is no longer visible
            app.campusMapService.viewModel.hideMap();
            
        },
        
       
        viewModel: new CampusMapViewModel()
    };
    
}
)(window, jQuery);