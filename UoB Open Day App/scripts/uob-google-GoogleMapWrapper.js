
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
        var destinationLatLng = null;
        var destinationDescription = null;
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
            
            if (!googleMap){
                uob.log.addLogWarning("No google map found to retain current centre");
                return;
            }
            
            var center = googleMap.getCenter();
            if(!center){
                uob.log.addLogWarning("No center found to retain");    
                return;
            }
            centerToRetain = new google.maps.LatLng( center.lat(), center.lng());
            
            google.maps.event.addListenerOnce(googleMap, 'center_changed', trackCenter);
                        
            console.log("Retaining center: " + centerToRetain);
                        
        };
                
        var trackUser = function(){
            if (!watchId){
                var geoLocationOptions = {timeout: 10000, enableHighAccuracy: true, maximumAge: 2000};
                setMapStatus("Locating ...");
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
                if (destinationLatLng)
                {
                    //If we've got a destination, just put the description in without the distance -- if the 
                    //description is null, that will just clear the last tracking message
                    setMapMessage(destinationDescription);    
                }
            }
        };
        
        var watchPositionHighAccuracy = function(position){
            showPositionOnMap(position);
        };
        
        var showPositionOnMap = function (position) {
            if (!watchId)
            {
                console.log("There is no watch set so not showing position");
                return;
            }
            
            if (!googleMap)
            {
                ob.log.addLogWarning("There is no google map so not showing position");
                return;    
            }
            
            if (!googleMap.getBounds())
            {
                ob.log.addLogWarning("There is no google map bounds so not showing position");
                return;    
            }
            
            //Get the current position as LatLng
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            //If not on the map don't track more than 3km don't track:
            var currentMapBounds = googleMap.getBounds();
            var isOnMap = currentMapBounds.contains(positionLatLng);
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
            
            if (isOnMap){
                setMapStatus("On Map");
            }
            else{
                
                var relation = uob.google.getDirectionFromBounds(currentMapBounds, positionLatLng);
                setMapStatus(relation + " of Map");   
            }            
            
            if (destinationLatLng)
            {
                var messageDescription = destinationDescription;
                if (!messageDescription)
                {
                    messageDescription = "your destination";
                }
                
                var distanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, destinationLatLng);
                var minutesToReach = distanceInKm/.060;
                minutesToReach = Math.round(minutesToReach);
                var mapMessage = minutesToReach + " minutes from " + messageDescription;
                if (minutesToReach===1){
                    mapMessage = minutesToReach + " minute from " + messageDescription;
                }
                if (minutesToReach===0){
                    mapMessage = "You have reached " + messageDescription;
                }
                setMapMessage(mapMessage);
            }
        };
        
        var watchPositionHighAccuracyError = function(error){
            console.log("High accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            setMarker(null);
            if (watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                uob.log.addLogWarning("High accuracy position error. Code: "+ error.code + " Message: " + error.message);
                setMapStatus('Position currently unavailable');
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
            if (googleMap){
                //This should handle any issues with the view of the map.
                google.maps.event.trigger(googleMap, "resize");
            }
        };
        
        var hideMap = function(){
            //Get rid of events which aren't needed when map is not visible.
            untrackUser();
            global.removeEventListener('orientationchange', orientationchange);
            //Clear any old messages:
            setMapMessage(null);
        };
        
        var setDestination = function(latLng, description)
        {
            if (destinationLatLng && !latLng)
            {
                //This will remove the existing destination so clear any existing messages
                setMapMessage(null);
			}            
            destinationLatLng = latLng;
            destinationDescription = description;
        }
        
        var clearDestination = function()
        {
            setDestination(null, null);
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
            setDestination: setDestination,
            clearDestination: clearDestination,
            centerOnMapData: centerOnMapData,
            getTrackingDistanceInKm: getTrackingDistanceInKm
        };
        
    };    

}
)(window, jQuery);