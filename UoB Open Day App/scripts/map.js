(function (global, $j) {
    
    var CampusMapViewModel,
        app = global.app = global.app || {};

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
            
            $j.getJSON(app.UoBMapsService, function (mapData) {

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
                             return getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
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
            
            app.campusMapService.showBuildings();
                            
            app.campusMapService.viewModel.showMap();
                
        },
        
        showHelpPoints: function(){this.helpPointsLayer.setMap(app.campusMapService.campusGoogleMap);},
        
        showBuildings: function(){
            
            if (app.campusMapService.buildings.length)
            {
                console.log("Showing building data");
                for (var i in app.campusMapService.buildings) {

                    var building = app.campusMapService.buildings[i];
                    
                    if (typeof building.googlePolygon === "undefined") {
                        
                        var polygonCoordinates = building.PolygonCoordinatesAsArrayList;

                        var googleBuildingCoords = [];

                        for (var pci in polygonCoordinates) {
                            var coords = polygonCoordinates[pci];
                            googleBuildingCoords.push(new google.maps.LatLng(coords[0], coords[1]));
                        }
                        building.googlePolygon = getPolygon(googleBuildingCoords, building.Colour);
                    }
                    
                    if (typeof building.googleMapLabels === "undefined"){
                        
                        var center = getPolygonCenter(building.googlePolygon);
                        var labelText = building.BuildingName;
                        building.googleMapLabels = getMapLabels(labelText, center);
                    }
                                        
                    building.googlePolygon.setMap(app.campusMapService.campusGoogleMap);
                    for (var iml in building.googleMapLabels){
                        var mapLabel = building.googleMapLabels[iml];
                        mapLabel.setMap(app.campusMapService.campusGoogleMap);
                    }
                }
                
            }
            else{
                console.log("Retrieving building data");
                $j.getJSON(app.UoBEventsService + 'buildings/', function(buildingData) {

                    console.log("Setting building data");
                    app.campusMapService.buildings = buildingData;
                    //Now call self again to show them :
                    app.campusMapService.showBuildings();
                });
            }

        },
        
        show: function () {
            if (!app.campusMapService.viewModel.get("isGoogleMapsInitialized")) {
                return;
            }
            //Tell map that is now visible
            app.campusMapService.viewModel.showMap();
            
        },

        
        
        hide: function () {
        
            //Tell map that it is no longer visible
            app.campusMapService.viewModel.hideMap();
            
        },
        
       
        viewModel: new CampusMapViewModel()
    };
    
        
    var getLatLngBounds = function (swLat, swLng, neLat, neLng) {
        var swLatLng = new google.maps.LatLng(swLat, swLng);
        var nwLatLng = new google.maps.LatLng(neLat, neLng);
        return new google.maps.LatLngBounds(swLatLng, nwLatLng);
    };
    
    var getPolygon = function (googlePolygonCoords, colour) {
    
        var strokeWeight = 1;
        var strokeOpacity = 1;
        var fillOpacity = 0.5;
        
        var googlePolygon = new google.maps.Polygon({
            paths: googlePolygonCoords,
            strokeColor: colour,
            strokeOpacity: strokeOpacity,
            strokeWeight: strokeWeight,
            fillColor: colour,
            fillOpacity: fillOpacity
        });
        
        return googlePolygon;
                    
    }
    
    var getMapLabels = function(text, latLng)
    {
        var mapLabels = [];
        //First chop up the text into two word chunks
        var formattedText = text.replace(/(\w+\W+\w+)\W+/ig,"$1\n");
        
        var labelTexts = formattedText.split("\n");
        
        if (labelTexts){
            for (index = 0; index <labelTexts.length; ++index) {
                
                var labelText = labelTexts[index];
                var lat = latLng.lat() + ((labelTexts.length/2 - index) * .000125);
                var lng = latLng.lng();
                var mapLatLng = new google.maps.LatLng(lat, lng);
                
                var mapLabel = getMapLabel(labelText, mapLatLng);
                
                mapLabels.push(mapLabel);
            }
        }
        
       return mapLabels;
    }
    
    var getMapLabel = function(text, latLng)
    {
       var mapLabel = new MapLabel({
          text: text,
          position: latLng,
          fontSize: 10,
          minZoom: 16,
          align: 'center'
        });
    
       return mapLabel;
    }
    
    var getPolygonCenter = function (polygon){
        
        var bounds = new google.maps.LatLngBounds()
        polygon.getPath().forEach(function(element,index){bounds.extend(element)})
        
        return bounds.getCenter();
    }
    
    
}
)(window, jQuery);