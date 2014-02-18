(function (global, $j) {
    
    var campusGoogleMap,
        campusMap,
        CampusMapViewModel,
        app = global.app = global.app || {};

    
    CampusMapViewModel = kendo.data.ObservableObject.extend({
        _lastMarker: null,
        _isLoading: false,
        _centerToRetain: null,
        _watchId: "",
        address: "",
        isGoogleMapsInitialized: false,

        showLoading: function () {
            if (this._isLoading) {
                app.application.showLoading();
            }
        },

        hideLoading: function () {
            app.application.hideLoading();
        },
        
        trackUser: function(){
            var that = this;
            if (!that._watchId){
                var geoLocationOptions = {timeout: 30000, enableHighAccuracy: true};
                that._watchId = navigator.geolocation.watchPosition(that._showPositionOnMap, that._watchPositionError, geoLocationOptions);
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
        }
        ,
        returnToCampus: function()
        {
            if (campusGoogleMap){
                campusGoogleMap.setZoom(15);
                campusGoogleMap.setCenter(campusMap.latLngBounds().getCenter());
             }
        },
        trackCenter: function()
        {
            var centerToRetain = campusMap.centerToRetain;
            
            if (centerToRetain!==undefined && centerToRetain!==null)
            {
                var center = campusGoogleMap.getCenter();
                 if (!center.equals(centerToRetain)){
                     
                     var newCenter = centerToRetain;
                     campusMap.centerToRetain = null;
                     console.log("Resetting center from " + center + " to " + newCenter);
                     campusGoogleMap.setCenter(newCenter);
                 }
 
            }
        },
        keepCurrentCenter: function(){
            
            var center = campusGoogleMap.getCenter();
            
            campusMap.centerToRetain = new google.maps.LatLng( center.lat(), center.lng());
            console.log("Retaining center: " + campusMap.centerToRetain);
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
                map: campusGoogleMap,
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
        
        initialise: function () {
            
            $j('#no-map').text('Initialising map ...');
            app.campusMapService.viewModel.showLoading();

            var mapOptions;

            if (typeof google === "undefined"){
                $j('#no-map').text('Error initialising map: Google not found');
                return;
            } 
           
            $j.getJSON(app.UoBMapsService, function (mapData) {

                console.log("Map data retrieved");                
                var uobMaps = mapData;
                if (!uobMaps) {
                    $j('#no-map').text('Error initialising map: Map data not found');
                    return;
                }
                else{
                    console.log("Retrieved " + uobMaps.length + " maps");
                }
                
                for (var i in uobMaps) {
                    //Setup the lat lng bounds on the uob maps:
                    var uobMap = uobMaps[i];
                    if (uobMap.MapName.indexOf("Edgbaston") !== -1) {
                        campusMap = uobMap;
                    }
                }
                
                if (campusMap) {
                    campusMap.latLngBounds = function(){
                         return getLatLngBounds(this.SouthWestLatitude, this.SouthWestLongitude, this.NorthEastLatitude, this.NorthEastLongitude);
                    }
                }
                else{
                    //No campus map so exit:
                    $j('#no-map').text('Error initialising map: Edgbaston Campus Map data not found');
                    return;
                }
                
                console.log("Setting google map initialised");
                app.campusMapService.viewModel.set("isGoogleMapsInitialized", true);

                mapOptions = {
                    zoom: 15,
                    center: campusMap.latLngBounds().getCenter(),
                    zoomControl: true,
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.LEFT_BOTTOM
                    },

                    mapTypeControl: false,
                    streetViewControl: false
                };

                campusGoogleMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
                
                app.campusMapService.showHelpPoints();
                
                app.campusMapService.showBuildings();
                
                //Track centers so that we can retain them
                google.maps.event.addListener(campusGoogleMap, 'center_changed', app.campusMapService.viewModel.trackCenter );
                
                app.campusMapService.showMap();
                
            }).error(function(jqXHR, textStatus, errorThrown) {
                $j('#no-map').text('Error initialising map: Map data retrieval error');
                console.log("error " + textStatus);
                console.log("incoming Text " + jqXHR.responseText);
            })
        },
        
        showHelpPoints: function(){this.helpPointsLayer.setMap(campusGoogleMap);},
        
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
                    
                    building.googlePolygon.setMap(campusGoogleMap);

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
            
            //In case of orientation change
            app.campusMapService.viewModel.keepCurrentCenter();
            
            app.campusMapService.showMap();
            
        },

        orientationchange: function()
        {
            console.log("Orientation change");
            app.campusMapService.viewModel.keepCurrentCenter();
        },
        
        hide: function () {
            
            
            //Get rid of events which aren't needed when map is not visible.
            app.campusMapService.viewModel.untrackUser();
            global.removeEventListener('orientationchange', app.campusMapService.orientationchange);
        
            //hide loading mask if user changed the tab as it is only relevant to location tab
            app.campusMapService.viewModel.hideLoading();
            
        },
        
        showMap: function()
        {
            
            global.addEventListener('orientationchange', app.campusMapService.orientationchange);
            //Setup user geolocation tracking
            app.campusMapService.viewModel.trackUser();
            app.campusMapService.viewModel.hideLoading();
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
    
}
)(window, jQuery);