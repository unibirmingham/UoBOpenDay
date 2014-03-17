
(function (global, $j) {

    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    uob.google = uob.google || {};
    

	uob.google.googleMapWrapper = function(googleMap, mapData)
    {
        
        var _self = this,
        	_googleMap= googleMap,
        	_mapData = mapData,
        	_lastMarker= null,
        	_centerToRetain = null,
        	_latLngToTrack = null,
        	_watchId = "";
        
        this.trackingDistanceInKm= 2;
      
        this.getGoogleMap = function()
        {
            return _googleMap;
        }
        
        this.setMapMessage = function(text){
            if (!text){
                text = "";
            }
            _googleMapParentDiv().find(".mapMessage").text(text);
        };
        
        this.showMap = function(){
			google.maps.event.addListener(_googleMap, 'center_changed', _trackCenter);
            //Clear any old messages:
            _self.setMapMessage(null);
            global.addEventListener('orientationchange', _orientationchange);
            //Setup user geolocation tracking
            _trackUser();
        };
        
        this.hideMap = function(){
            //Get rid of events which aren't needed when map is not visible.
            _untrackUser();
            global.removeEventListener('orientationchange', _orientationchange);
            google.maps.event.addListener(_googleMap, 'center_changed', _trackCenter);
        };
                
        this.trackLatLng = function(latLng)
        {
            if (_latLngToTrack!==null && latLng===null)
            {
                //Basically this will clear the existing message.
                _self.setMapMessage(null);
			}            
            _latLngToTrack = latLng;

        },
        this.centerOnMapData = function()
        {
            if (_googleMap && _mapData){
                _googleMap.setZoom(15);
                _googleMap.setCenter(_mapData.getLatLngBounds().getCenter());
             }
        };
        
        //When the orientation is changed this can lose the center of the map -- these functions keep it and reinstate it.
        var _orientationchange =  function()
        {
            
            console.log("Orientation change");
            _keepCurrentCenter();
        };
        
        var _trackCenter = function()
        {
            if (_centerToRetain!==undefined && _centerToRetain!==null)
            {
                var center = _googleMap.getCenter();
                 if (!center.equals(_centerToRetain)){
                     
                     var newCenter = _centerToRetain;
                     _centerToRetain = null;
                     console.log("Resetting center from " + center + " to " + newCenter);
                     _googleMap.setCenter(newCenter);
                 }
 
            }
        };
        var _keepCurrentCenter = function(){
            var that= this;
            var center = _googleMap.getCenter();
            
            _centerToRetain = new google.maps.LatLng( center.lat(), center.lng());
            console.log("Retaining center: " + that._centerToRetain);
        };
                
        var _trackUser = function(){
            if (!_watchId){
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: true, maximumAge: 2000};
                _mapStatus("Tracking ...");
                _watchId = navigator.geolocation.watchPosition(_watchPositionHighAccuracy, _watchPositionHighAccuracyError, geoLocationOptions);
                console.log("Tracking user with watch id: " + _watchId);
            }
            else{
                console.log("Already tracking user with watch id: " + _watchId);
            }
        };
        var _untrackUser = function(){
           if (_watchId)
            {
                navigator.geolocation.clearWatch(_watchId);
                console.log("Untracking user with watch id: " + _watchId);
                _watchId = "";
                _setMarker(null);
            }
        };
        
        var _watchPositionHighAccuracy = function(position){
            _mapStatus("High");
            _showPositionOnMap(position);
        };
        var _watchPositionLowAccuracy = function(position){

            _mapStatus("Low");
            _showPositionOnMap(position);
        };
        
        var _showPositionOnMap = function (position) {
            if (!_watchId)
            {
                console.log("There is no watch set so not showing position");
                return;
            }
            
            //Get the current position as LatLng
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            //If not on the map don't track more than 3km don't track:
            var isOnMap = _googleMap.getBounds().contains(positionLatLng);
            var mapCenter = _googleMap.getCenter();
            var kmFromCenterOfMap = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, mapCenter);
            
            if (!isOnMap && kmFromCenterOfMap> this.trackingDistanceInKm){
                
                uob.log.addLogMessage("User is off map and " + kmFromCenterOfMap + "km from center -- untracking");
                _mapStatus("Off Map");
                _untrackUser();
                return;
            }
            
            _setMarker(positionLatLng);
            if (_latLngToTrack)
            {
                var distanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, _latLngToTrack);
                var minutesToReach = distanceInKm/.060;
                minutesToReach = Math.round(minutesToReach);
                var mapMessage = minutesToReach + " minutes from destination";
                if (minutesToReach===1){
                    mapMessage = minutesToReach + " minute from destination";
                }
                if (minutesToReach===0){
                    mapMessage = "You have reached your destination";
                }
                _self.setMapMessage(mapMessage);
            }
        };
        
        var _watchPositionHighAccuracyError = function(error){
            console.log("High accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            _setMarker(null);
            if (_watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                _mapStatus('No GPS signal');
            
                uob.log.addLogWarning("High accuracy position error so trying low accuracy location Code: "+ error.code + " Message: " + error.message);
                _untrackUser();
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: false, maximumAge: 2000};
                _watchId = navigator.geolocation.watchPosition(_watchPositionLowAccuracy, _watchPositionLowAccuracyError, geoLocationOptions);
            }
        }
        var _watchPositionLowAccuracyError = function(error)
        {
            _setMarker(null);
            _mapStatus("Unknown");
            console.log("Low accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            
            if (_watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                uob.log.addLogError("Low accuracy position error: Untracking user. Code: " + error.code + " Message: " + error.message);
                _untrackUser();
                _mapStatus('Not tracking');
            }
        }
        
        var _setMarker = function(positionLatLng)
        {
            //Get rid of last marker if there is one
            if (_lastMarker !== null && _lastMarker !== undefined) {
                _lastMarker.setMap(null);
            }
            
            if (positionLatLng!==null){
                console.log("Putting marker in for current position");
                _lastMarker = new google.maps.Marker({
                    map: _googleMap,
                    position: positionLatLng
                });
            }
        };
        
        var _googleMapParentDiv = function(){
            return $j(_googleMap.getDiv()).parent();
        }
               
        var _mapStatus = function(text){
            
            _googleMapParentDiv().find(".mapStatus").text(text);
        };
        
    };    

}
)(window, jQuery);