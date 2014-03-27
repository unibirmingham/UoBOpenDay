
(function (global, $j) {

    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    uob.google = uob.google || {};
    

	uob.google.GoogleMapWrapper = function(googleMap, mapData)
    {
        
        var lastMarker= null;
        var centerToRetain = null;
        var latLngToTrack = null;
        var latLngToTrackDescription = null;
        var watchId = "";
              
        //When the orientation is changed this can lose the center of the map -- these functions keep it and reinstate it.
        var orientationchange =  function()
        {
            console.log("Orientation change");
            keepCurrentCenter();
        };
        
        var trackCenter = function()
        {
            if (centerToRetain!==undefined && centerToRetain!==null)
            {
                var center = googleMap.getCenter();
                 if (!center.equals(centerToRetain)){
                     
                     var newCenter = centerToRetain;
                     centerToRetain = null;
                     console.log("Resetting center from " + center + " to " + newCenter);
                     googleMap.setCenter(newCenter);
                 }
             }
        };
        var keepCurrentCenter = function(){
            var center = googleMap.getCenter();
            centerToRetain = new google.maps.LatLng( center.lat(), center.lng());
            
            google.maps.event.addListenerOnce(googleMap, 'center_changed', trackCenter);
                        
            console.log("Retaining center: " + centerToRetain);
        };
                
        var trackUser = function(){
            if (!watchId){
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: true, maximumAge: 2000};
                setMapStatus("Tracking ...");
                watchId = navigator.geolocation.watchPosition(watchPositionHighAccuracy, watchPositionHighAccuracyError, geoLocationOptions);
                console.log("Tracking user with watch id: " + watchId);
            }
            else{
                console.log("Already tracking user with watch id: " + watchId);
            }
        };
        var untrackUser = function(){
           if (watchId)
            {
                navigator.geolocation.clearWatch(watchId);
                console.log("Untracking user with watch id: " + watchId);
                watchId = "";
                setMarker(null);
            }
        };
        
        var watchPositionHighAccuracy = function(position){
            showPositionOnMap(position,"High");
        };
        
        var watchPositionLowAccuracy = function(position){
            showPositionOnMap(position, "Low");
        };
        
        var showPositionOnMap = function (position, accuracy) {
            if (!watchId)
            {
                console.log("There is no watch set so not showing position");
                return;
            }
            
            //Get the current position as LatLng
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            //If not on the map don't track more than 3km don't track:
            var isOnMap = googleMap.getBounds().contains(positionLatLng);
            var mapCenter = googleMap.getCenter();
            var kmFromCenterOfMap = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, mapCenter);
            
            var trackingDistance = getTrackingDistanceInKm();
            
            if (!isOnMap && kmFromCenterOfMap> trackingDistance){
                
                uob.log.addLogMessage("User is off map and " + kmFromCenterOfMap + "km from center. Tracking distance is: " + trackingDistance + "km -- untracking");
                setMapStatus("Off Map");
                untrackUser();
                return;
            }
            
            setMarker(positionLatLng);
            setMapStatus(accuracy);
            if (latLngToTrack)
            {
                if (!latLngToTrackDescription)
                {
                    latLngToTrackDescription = "your destination";
                }
                
                var distanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, latLngToTrack);
                var minutesToReach = distanceInKm/.060;
                minutesToReach = Math.round(minutesToReach);
                var mapMessage = minutesToReach + " minutes from " + latLngToTrackDescription;
                if (minutesToReach===1){
                    mapMessage = minutesToReach + " minute from " + latLngToTrackDescription;
                }
                if (minutesToReach===0){
                    mapMessage = "You have reached " + latLngToTrackDescription;
                }
                setMapMessage(mapMessage);
            }
        };
        
        var watchPositionHighAccuracyError = function(error){
            console.log("High accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            setMarker(null);
            if (watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                setMapStatus('No GPS signal');
            
                uob.log.addLogWarning("High accuracy position error so trying low accuracy location. Code: "+ error.code + " Message: " + error.message);
                untrackUser();
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: false, maximumAge: 2000};
                watchId = navigator.geolocation.watchPosition(watchPositionLowAccuracy, watchPositionLowAccuracyError, geoLocationOptions);
            }
        }
        var watchPositionLowAccuracyError = function(error)
        {
            setMarker(null);
            setMapStatus("Unknown");
            console.log("Low accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            
            if (watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                uob.log.addLogError("Low accuracy position error: Untracking user. Code: " + error.code + " Message: " + error.message);
                untrackUser();
                setMapStatus('Not tracking');
            }
        }
        
        var setMarker = function(positionLatLng)
        {
            //Get rid of last marker if there is one
            if (lastMarker !== null && lastMarker !== undefined) {
                lastMarker.setMap(null);
            }
            
            if (positionLatLng!==null){
                console.log("Putting marker in for current position");
                lastMarker = new google.maps.Marker({
                    map: googleMap,
                    position: positionLatLng
                });
            }
        };
        
        var getGoogleMapParentDiv = function(){
            return $j(googleMap.getDiv()).parent();
        }
        
        var setMapStatus = function(text){
            getGoogleMapParentDiv().find(".mapStatus").text(text);
        };
        
        //Public methods:
        var getGoogleMap = function()
        {
            return googleMap;
        }
        
        var setMapMessage = function(text){
            if (!text){
                text = "";
            }
            getGoogleMapParentDiv().find(".mapMessage").text(text);
        };
        
        var showMap = function(){

            global.addEventListener('orientationchange', orientationchange);
            //Setup user geolocation tracking
            trackUser();
        };
        
        var hideMap = function(){
            //Get rid of events which aren't needed when map is not visible.
            untrackUser();
            global.removeEventListener('orientationchange', orientationchange);
            //Clear any old messages:
            setMapMessage(null);
        };
        
        var trackLatLng = function(latLng, description)
        {
            if (latLngToTrack!==null && latLng===null)
            {
                //Basically this will clear the existing message.
                setMapMessage(null);
			}            
            latLngToTrack = latLng;
            latLngToTrackDescription = description;
        }
        
        var centerOnMapData = function()
        {
            if (googleMap && mapData){
                var mapBounds = mapData.getLatLngBounds();
                googleMap.fitBounds(mapBounds);
                google.maps.event.addListenerOnce(googleMap, 'idle', function() {
                    if (googleMap.getZoom() < 15){
                            //If the map is now to far zoomed out, bring it closer:
                            googleMap.setCenter(mapBounds.getCenter());
                            googleMap.setZoom(15);
                        }
                });
             }
        };
        
        var getTrackingDistanceInKm = function()
        {
            var neLatLng = new google.maps.LatLng(mapData.NorthEastLatitude, mapData.NorthEastLongitude);
            var swLatLng = new google.maps.LatLng(mapData.SouthWestLatitude, mapData.SouthWestLongitude);
            var trackingDistanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(neLatLng, swLatLng);
            //The tracking distance is the diagonal map distance (the actual map bounds will be wider) and if a user is just off screen then it's still worth tracking.
            return trackingDistanceInKm;
        }
        
        //When initialised center the map.
        centerOnMapData();
        
        return {
            getGoogleMap: getGoogleMap,
            setMapMessage: setMapMessage,
            showMap: showMap,
            hideMap: hideMap,
            trackLatLng: trackLatLng,
            centerOnMapData: centerOnMapData,
            getTrackingDistanceInKm: getTrackingDistanceInKm
            
            
        };
        
    };    

}
)(window, jQuery);