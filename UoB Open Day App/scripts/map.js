(function (global, $j) {
    
    var CampusMapViewModel;
    var app = global.app = global.app || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    
    
    var date = new Date();
    var year = date.getFullYear();
    var eventBuildingsJsonUrl = uob.url.EventsService + 'buildings/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    
    var mapsJsonUrl = uob.url.MapsService;
    
        
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
        _buildingIdToShow: null,

        _mapSuccess: function(data)
        {
            var that = this;
            that._setMapData(data);
        },
        _mapCacheSuccess: function(data)
        {
            var that = this;
            uob.log.addCacheMessage('Maps: Data is from cache');
            that._setMapData(data);            
        },
        _mapError: function(data)
        {
            var that = this;
            uob.log.addErrorMessage('No maps data available.');
            that.viewModel.hideLoading();
        },
        
        loadMapData: function (){
            
            var that = this;
            that.viewModel.showLoading();
            uob.log.addLogMessage("Initialising Map Data");            
            uob.json.getJSON ("Maps", mapsJsonUrl, 'data/maps.json', that._mapSuccess.bind(that), that._mapCacheSuccess.bind(that), that._mapError.bind(that));

        },

        _setMapData: function(mapItems){
            var that = this;
            for (var i in mapItems) {
                //Setup the lat lng bounds on the uob maps:
                var mapItem = mapItems[i];
                if (mapItem.MapName.indexOf("Edgbaston") !== -1) {
                    that.campusMapData = mapItem;
                }
            }
            if (that.campusMapData) {
                that.campusMapData.latLngBounds = function(){
                     return uob.google.getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
                }
            }
            else{
                //No campus map so exit:
                uob.log.addErrorMessage('Error initialising map: Edgbaston Campus Map data not found');
                return;
            }
        
            that.viewModel.mapData = that.campusMapData;
            uob.screen.enableLinks("mapServiceButton");
            that.viewModel.hideLoading();
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
                        
                       
                        console.log("Setting center of map to center of " + building.BuildingName);
                        var selectedBuilding = building;
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

                        
                    }
                    
                    building.googlePolygon.setMap(googleMapForBuilding);
                    for (var iml in building.googleMapLabels){
                        var mapLabel = building.googleMapLabels[iml];
                        mapLabel.setMap(googleMapForBuilding);
                    }
                }
                
            }
            else{
                that._buildingIdToShow = buildingId;
                uob.json.getJSON ("Event Buildings", eventBuildingsJsonUrl, 'data/events-buildings.json', that._eventBuildingsSuccess.bind(that), that._eventBuildingsCacheSuccess.bind(that), that._eventBuildingsError.bind(that));
            }
        },
        _eventBuildingsSuccess: function(data)
        {
            var that = this;
            that._setBuildings(data);
        },
        _eventBuildingsCacheSuccess: function(data)
        {
            var that = this;
            uob.log.addCacheMessage('Events building data: From local cache');
            that._setBuildings(data);            
        },
        _eventBuildingsError: function(data)
        {
            uob.log.addErrorMessage('Events building data: Failed to retrieve data');
        },
        _setBuildings: function(data)
        {
            var that = this
            app.campusMapService.buildings = data;
            //Get the building to show if there is one:
            var buildingId = that._buildingIdToShow;
            that._buildingIdToShow = null;
            that.showBuildings(buildingId);
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