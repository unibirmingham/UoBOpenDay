(function (global, $j) {
    
    var CampusMapViewModel;
    var app = global.app = global.app || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    uob.map = uob.map || {};
    
    
    var date = new Date();
    var year = date.getFullYear();
    var eventBuildingsJsonUrl = uob.url.EventsService + 'buildings/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    
    var mapsJsonUrl = uob.url.MapsService;
    
        
    CampusMapViewModel = kendo.data.ObservableObject.extend({
        _googleMap: null,
        _lastMarker: null,
        _isLoading: false,
        _centerToRetain: null,
        _latLngToTrack: null,
        _watchId: "",
        mapData: null,
        isGoogleMapsInitialized: false,
        trackingDistanceInKm: 2,
        
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
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: true, maximumAge: 2000};
                that._mapStatus("Tracking ...");
                that._watchId = navigator.geolocation.watchPosition(that._watchPositionHighAccuracy.bind(that), that._watchPositionHighAccuracyError.bind(that), geoLocationOptions);
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
                that._setMarker(null);
            }
        },
        trackLatLng: function(latLng)
        {
            var that = this;
            that._latLngToTrack = latLng;
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
            if (!that._watchId)
            {
                console.log("There is no watch set so not showing position");
                return;
            }
            
            //Get the current position as LatLng
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            //If not on the map don't track more than 3km don't track:
            var isOnMap = that._googleMap.getBounds().contains(positionLatLng);
            var mapCenter = that._googleMap.getCenter();
            var kmFromCenterOfMap = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, mapCenter);
            
            if (!isOnMap && kmFromCenterOfMap> that.trackingDistanceInKm){
                
                uob.log.addLogMessage("User is off map and " + kmFromCenterOfMap + "km from center -- untracking");
                that._mapStatus("Off Map");
                that.untrackUser();
                return;
            }
            
            that._setMarker(positionLatLng);
            if (that._latLngToTrack)
            {
                var distanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, that._latLngToTrack);
                var minutesToReach = distanceInKm/.060;
                minutesToReach = Math.round(minutesToReach);
                var mapMessage = minutesToReach + " minutes from destination";
                if (minutesToReach===1){
                    mapMessage = minutesToReach + " minute from destination";
                }
                if (minutesToReach===0){
                    mapMessage = "You have reached your destination";
                }
                that._mapMessage(mapMessage);
            }
            else{
                 that._mapMessage("");
            }
        },
        _setMarker: function(positionLatLng)
        {
            var that = this;
            //Get rid of last marker if there is one
            if (that._lastMarker !== null && that._lastMarker !== undefined) {
                that._lastMarker.setMap(null);
            }
            
            if (positionLatLng!==null){
                console.log("Putting marker in for current position");
                that._lastMarker = new google.maps.Marker({
                    map: that._googleMap,
                    position: positionLatLng
                });
            }
        },
        _mapMessage: function(text){
            $j("#mapMessage").text(text);
        },
        _mapStatus: function(text){
            $j("#mapStatus").text(text);  
        },
        _watchPositionHighAccuracy: function(position){
            var that = this;
            that._mapStatus("High");
            that._showPositionOnMap(position);
        },
        _watchPositionLowAccuracy: function(position){
            var that = this;
            that._mapStatus("Low");
            that._showPositionOnMap(position);
        },
        _watchPositionHighAccuracyError: function(error){
            var that = this;
                      
            console.log("High accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            that._setMarker(null);
            if (that._watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                that._mapStatus('No GPS signal');
            
                uob.log.addLogWarning("High accuracy position error so trying low accuracy location Code: "+ error.code + " Message: " + error.message);
                that.untrackUser();
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: false, maximumAge: 2000};
                that._watchId = navigator.geolocation.watchPosition(that._watchPositionLowAccuracy.bind(that), that._watchPositionLowAccuracyError.bind(that), geoLocationOptions);
            }
        },
        _watchPositionLowAccuracyError: function(error)
        {
            var that = this;
            that._setMarker(null);
            that._mapStatus("Unknown");
            console.log("Low accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            
            if (that._watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                uob.log.addLogError("Low accuracy position error: Untracking user. Code: " + error.code + " Message: " + error.message);
                that.untrackUser();
                that._mapStatus('Not tracking');
            }

        }
        
    });

    app.campusMapService = {
        
        helpPointsLayer: new google.maps.KmlLayer('http://mapsengine.google.com/map/kml?mid=zVpAqNihyIqo.kUp2n30TUjHY&amp;lid=zVpAqNihyIqo.k484h8JBYbe8',{preserveViewport: true, suppressInfoWindows: true}),
        
        campusMapData: null,
        
        campusGoogleMap: null,
        
        buildingMap: null,
        
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
            
            var mapOptions = {
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

            var campusGoogleMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            
            campusGoogleMap.mapTypes.set('Campus Map', campusMapStyle);
            campusGoogleMap.setMapTypeId('Campus Map');
            
            app.campusMapService.viewModel.setGoogleMap ( campusGoogleMap);
            app.campusMapService.campusGoogleMap = campusGoogleMap;
            
            app.campusMapService.showHelpPoints();
            
            app.campusMapService.buildingMap = new uob.map.buildingMap(campusGoogleMap, eventBuildingsJsonUrl, 'data/events-buildings.json');
            
            app.campusMapService.viewModel.showMap();
            
        },
        
        showHelpPoints: function(){this.helpPointsLayer.setMap(app.campusMapService.campusGoogleMap);},
        
        _showBuildingsSuccess: function(buildingId)
        {
            var that = this;
            var center = null;
            if (buildingId){
                buildingId = parseInt(buildingId);
                if (buildingId)
                {
                    center = app.campusMapService.buildingMap.getBuildingCenterLatLng(buildingId);
                }
            }
            that.viewModel.trackLatLng(center);
            
        },
        
        show: function (e) {
            
            console.log("Map show");
            if (!app.campusMapService.viewModel.get("isGoogleMapsInitialized")) {
                return;
            }
            var buildingId = e.view.params.buildingId;
            
            app.campusMapService.buildingMap.showBuildings(buildingId, app.campusMapService._showBuildingsSuccess.bind(app.campusMapService) );
            
            //Tell map that is now visible
            app.campusMapService.viewModel.showMap();
            
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