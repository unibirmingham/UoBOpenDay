(function (global, $j) {
    //Library of useful google map functions:
    var uob = global.uob = global.uob || {};
    uob.google = uob.google || {};
         
    uob.google.getLatLngBounds = function (swLat, swLng, neLat, neLng) {
        var swLatLng = new google.maps.LatLng(swLat, swLng);
        var nwLatLng = new google.maps.LatLng(neLat, neLng);
        return new google.maps.LatLngBounds(swLatLng, nwLatLng);
    };
    
    uob.google.getPolygon = function (googlePolygonCoords, colour) {
    
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
    
    uob.google.getMapLabels = function(text, latLng)
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
                
                var mapLabel = uob.google.getMapLabel(labelText, mapLatLng);
                
                mapLabels.push(mapLabel);
            }
        }
        
       return mapLabels;
    }
    
    uob.google.getMapLabel = function(text, latLng)
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
    
    uob.google.getPolygonLatLngBounds = function(polygon)
    {
        var bounds = new google.maps.LatLngBounds()
        polygon.getPath().forEach(function(element,index){bounds.extend(element)})
        return bounds;
    }
    
    uob.google.getPolygonCenter = function (polygon){
        
        return uob.google.getPolygonLatLngBounds(polygon).getCenter();
    }
    
    uob.google.extendMapToShowPoints = function(googleMap, latLngArray){
        var bounds = new google.maps.LatLngBounds();
        
        for (var index = 0; index <latLngArray.length; ++index) {
            bounds.extend(latLngArray[index]);
        }
        googleMap.fitBounds(bounds);
    }
    
    uob.google.getDistanceBetweenTwoLatLngsInKm = function(latLng1, latLng2)
    {
          //This is an implementation of the Haversine formula to save importing the google geometry library:
          var earthsRadius = 6371; // earth's mean radius in km
          var latDiff  = _degreesToRadians(latLng2.lat() - latLng1.lat());
          var lngDiff = _degreesToRadians(latLng2.lng() - latLng1.lng());

          var a = Math.sin(latDiff/2) * Math.sin(latDiff/2) +
                  Math.cos(_degreesToRadians(latLng1.lat())) * Math.cos(_degreesToRadians(latLng2.lat())) * Math.sin(lngDiff/2) * Math.sin(lngDiff/2);
          var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          var d = earthsRadius * c;

          return d.toFixed(3);
    }
    
    var _degreesToRadians = function(degrees) {return degrees*Math.PI/180;}
    
}
)(window, jQuery);