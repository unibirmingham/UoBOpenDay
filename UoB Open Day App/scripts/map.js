(function (global, $j) {
    
    var map,
        campusMap,
        CampusMapViewModel,
        app = global.app = global.app || {};

    
    CampusMapViewModel = kendo.data.ObservableObject.extend({
        _lastMarker: null,
        _isLoading: false,
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
        _showPositionOnMap: function (position) {
            var that = this;

            if (that._lastMarker !== null && that._lastMarker !== undefined) {
                that._lastMarker.setMap(null);
            }
            //Get the current position
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            console.log("Putting marker in for current position");
            that._lastMarker = new google.maps.Marker({
                map: map,
                position: positionLatLng
            });
        },
        
        _watchPositionError: function(error){
            console.log("Error watching position. Code: " + error.code + " Message: " + error.message);
        }
    });

    app.campusMapService = {
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
                    campusMap.latLngBounds = getLatLngBounds(campusMap.SouthWestLatitude, campusMap.SouthWestLongitude, campusMap.NorthEastLatitude, campusMap.NorthEastLongitude);
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
                    center: campusMap.latLngBounds.getCenter(),
                    zoomControl: true,
                    zoomControlOptions: {
                        position: google.maps.ControlPosition.LEFT_BOTTOM
                    },

                    mapTypeControl: false,
                    streetViewControl: false
                };

                map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
                
                app.campusMapService.viewModel.trackUser();
                
                app.campusMapService.viewModel.hideLoading();
                
            }).error(function(jqXHR, textStatus, errorThrown) {
                $j('#no-map').text('Error initialising map: Map data retrieval error');
                console.log("error " + textStatus);
                console.log("incoming Text " + jqXHR.responseText);
            })
        },

        show: function () {
            if (!app.campusMapService.viewModel.get("isGoogleMapsInitialized")) {
                return;
            }

            //show loading mask in case the location is not loaded yet 
            //and the user returns to the same tab
            app.campusMapService.viewModel.showLoading();

            //resize the map in case the orientation has been changed while showing other tab
            google.maps.event.trigger(map, "resize");
            app.campusMapService.viewModel.trackUser();
        },

        hide: function () {
            //hide loading mask if user changed the tab as it is only relevant to location tab
            app.campusMapService.viewModel.hideLoading();
            app.campusMapService.viewModel.untrackUser();
        },

        viewModel: new CampusMapViewModel()
    };
    
        
    var getLatLngBounds = function (swLat, swLng, neLat, neLng) {
        var swLatLng = new google.maps.LatLng(swLat, swLng);
        var nwLatLng = new google.maps.LatLng(neLat, neLng);
        return new google.maps.LatLngBounds(swLatLng, nwLatLng);
    };

    
}
)(window, jQuery);