
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
        var latLngBoundsToFocusOn = null;
        var destinationLatLng = null;
        var destinationDescription = null;
        var trackingBounds = null;
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
                setCurrentPositionMarker(null);
                if (destinationLatLng)
                {
                    //If we've got a destination, just put the description in without the distance -- if the 
                    //description is null, that will just clear the last tracking message
                    setMapMessage(destinationDescription);    
                }
            }
        };
        
        var getCurrentGoodPositionAsLatLng = function(){
          
            if (lastMarker && lastMarker.getMap()){
                return lastMarker.getPosition();
            }
            return null;
            
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
                uob.log.addLogWarning("There is no google map so not showing position");
                return;    
            }
            
            if (!googleMap.getBounds())
            {
                uob.log.addLogWarning("There is no google map bounds so not showing position");
                return;    
            }
            
            //Get the current position as LatLng
            var positionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            
            //If not on the map don't track more than 3km don't track:
            var currentMapBounds = googleMap.getBounds();
            var isOnMap = currentMapBounds.contains(positionLatLng);
            var isInTrackingBounds = latLngIsInTrackingBounds(positionLatLng);
            
            if (!isOnMap && !isInTrackingBounds){
                
                uob.log.addLogMessage("User is off map and outside the tracking bounds: untracking");
                setMapStatus("Outside tracking area");
                untrackUser();
                return;
            }
            
            setCurrentPositionMarker(positionLatLng);
            
            if (isOnMap){
                setMapStatus("On Map");
            }
            else{
                
                var relation = uob.google.getDirectionFromBounds(currentMapBounds, positionLatLng);
                setMapStatus(relation + " of Map");   
            }            
            
            updateDestinationMessage();
            
        };
        
        var updateDestinationMessage = function(){

            var messageDescription;
            var positionLatLng;
            var mapMessage;
            
            if(destinationLatLng){

                messageDescription = destinationDescription;
                if (!messageDescription)
                {
                    messageDescription = "your destination";
                }
                
                positionLatLng = getCurrentGoodPositionAsLatLng();
                
                if (positionLatLng){
                    var distanceInKm = uob.google.getDistanceBetweenTwoLatLngsInKm(positionLatLng, destinationLatLng);
                    var minutesToReach = distanceInKm/.060;
                    minutesToReach = Math.round(minutesToReach);
                    
                    if (minutesToReach===0){
                        mapMessage = "You have reached " + messageDescription;
                    }
                    else{
                        
                        mapMessage = messageDescription + ": " + minutesToReach + " ";
                        
                        if (minutesToReach===1){
                            mapMessage = mapMessage + "minute away";
                        }
                        else{
                            mapMessage = mapMessage + "minutes away";
                        }
                    }
                }
                else{
                    mapMessage = destinationDescription;
                }
                
                setMapMessage(mapMessage);
       
            }
            
        };
        
        var watchPositionHighAccuracyError = function(error){
            console.log("High accuracy Error watching position. Code: " + error.code + " Message: " + error.message);
            setCurrentPositionMarker(null);
            if (watchId){
                //Only change map status if there's a current watch id being tracked as this could be an error related to a watch being cleared
                uob.log.addLogWarning("High accuracy position error. Code: "+ error.code + " Message: " + error.message);
                setMapStatus('Position currently unavailable');
            }
        }
        
        var setCurrentPositionMarker = function(positionLatLng)
        {
            //Get rid of last marker if there is one
            if (lastMarker) {
                lastMarker.setMap(null);
            }
            
            if (positionLatLng!==null){
                console.log("Putting marker in for current position");
                lastMarker = new google.maps.Marker({
                    map: googleMap,
                    position: positionLatLng
                });
                
                if (latLngBoundsToFocusOn){
                    console.log("Including latLngBoundsToFocusOn");
                    latLngBoundsToFocusOn.extend(positionLatLng);
                    googleMap.fitBounds(latLngBoundsToFocusOn);
                    latLngBoundsToFocusOn = null;
                }
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
        
        var addTrackingBounds = function (latLngBounds){
          
            if (!latLngBounds || latLngBounds.isEmpty()){
                console.log("Empty or null tracking bounds added.");
                return;
            }
            
            if (trackingBounds){
                trackingBounds.union(latLngBounds);
            }
            else{
                trackingBounds = latLngBounds;
            }
            
        };
        
        //This will focus the map on the latLngBounds, but will also include the current position if found later.
        var setLatLngBoundsToFocusOnAndTrack = function (latLngBoundsName, latLngBounds, minimumZoom){

            latLngBoundsToFocusOn = latLngBounds;
            if (latLngBounds){
                
                if (latLngBoundsName){
                    //Put the name of the latLng into the message
                    setDestination(latLngBounds.getCenter(), latLngBoundsName);
                }
                
                if (minimumZoom && googleMap.getZoom() < minimumZoom){
                    googleMap.setZoom(minimumZoom);
                }
                googleMap.setCenter(latLngBounds.getCenter());    
            }
        };
        
        var latLngIsInTrackingBounds = function (latLng){
            
            if (latLng && trackingBounds){
                return(trackingBounds.contains(latLng));
            }
            return false;
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
            updateDestinationMessage();
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
        
        var centerOnMapDataAndAdditionalKmlLayer = function(kmlLayer)
        {
            var mapBounds;
            var newBounds;
            
             if (googleMap && mapData && kmlLayer){
                newBounds = kmlLayer.getDefaultViewport();
                if (newBounds){
                    mapBounds = mapData.getLatLngBounds();
                    newBounds.extend(mapBounds.getNorthEast());
                    newBounds.extend(mapBounds.getSouthWest());
                    googleMap.fitBounds(newBounds);
                }
             }
        };
        
        var centerOnMapDataAndAdditionalMapData = function(additionalMapData)
        {
            var additionalMapBounds;
            var newBounds;
            
            additionalMapBounds = additionalMapData.getLatLngBounds();
            if (googleMap && mapData && additionalMapBounds){
                newBounds = mapData.getLatLngBounds();
                if (newBounds){
                    newBounds.extend(additionalMapBounds.getNorthEast());
                    newBounds.extend(additionalMapBounds.getSouthWest());
                    googleMap.fitBounds(newBounds);
                }
            }
        };
      
        
        if (mapData && mapData.getLatLngBounds()){
            //Initialise to track the map data.
            addTrackingBounds(mapData.getLatLngBounds());
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
            centerOnMapDataAndAdditionalKmlLayer: centerOnMapDataAndAdditionalKmlLayer,
            centerOnMapDataAndAdditionalMapData: centerOnMapDataAndAdditionalMapData,
            setLatLngBoundsToFocusOnAndTrack: setLatLngBoundsToFocusOnAndTrack,
            addTrackingBounds: addTrackingBounds,
            trackUser: trackUser
        };
        
    };    

}
)(window, jQuery);