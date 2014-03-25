(function (global, $j) {
    
    var app = global.app = global.app || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    uob.map = uob.map || {};
    uob.google = uob.google || {};
    
    
    var date = new Date();
    var year = date.getFullYear();
    var eventBuildingsJsonUrl = uob.url.EventsService + 'buildings/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    
    var foodAndDrinkFacilitiesJsonUrl = uob.url.MapsService + '54448/facilities/?categoryKey=0/1/2836/2837/2839/2975';
    
    var googleMapWrapper = null;
    var campusGoogleMap = null;
    var campusMapData = null;
    var buildingAndFacilitiesMap = null;
    
    app.campusMapService = {
        
        initialise: function () {

            $j('#no-map').text('Initialising map ...');
            console.log("Map initialise");

            if (typeof google === "undefined"){
                $j('#no-map').text('Error initialising map: Google not found');
                return;
            } 

            if (!app.repository.mapRepository || app.repository.mapRepository.getStatus()===uob.json.JsonStatus.ERROR)
            {
                $j('#no-map').text('Error initialising map: No map repository found');
                return;     
            }
            
            var mapItems = app.repository.mapRepository.getMaps();
            
            if (!mapItems)
            {
                $j('#no-map').text('Error initialising map: No campus map data found');
                return;     
            }
            
            for (var i in mapItems) {
                //Setup the lat lng bounds on the uob maps:
                var mapItem = mapItems[i];
                if (mapItem.MapName.indexOf("Edgbaston") !== -1) {
                    campusMapData = mapItem;
                }
            }
            if (!campusMapData) {
                uob.log.addErrorMessage('Error initialising map: Edgbaston Campus Map data not found');
                return;
            }
            
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
                zoomControl: true,
                zoomControlOptions: {
                    position: google.maps.ControlPosition.LEFT_BOTTOM
                },
                mapTypeControl: false,
                streetViewControl: false,
                mapTypeControlOptions: {mapTypeIds: ['Campus Map']}
            };

            campusGoogleMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            
            campusGoogleMap.mapTypes.set('Campus Map', campusMapStyle);
            campusGoogleMap.setMapTypeId('Campus Map');
            
            googleMapWrapper = new uob.google.GoogleMapWrapper(campusGoogleMap, campusMapData);
            
            var helpPointsLayer = new google.maps.KmlLayer('http://mapsengine.google.com/map/kml?mid=zVpAqNihyIqo.kUp2n30TUjHY&amp;lid=zVpAqNihyIqo.k484h8JBYbe8',{preserveViewport: true, suppressInfoWindows: true});
        
            helpPointsLayer.setMap(campusGoogleMap);
                        
            buildingAndFacilitiesMap = new uob.map.BuildingAndFacilitiesMap(googleMapWrapper);
            
            googleMapWrapper.showMap();
            
            $j('#map-return-to-campus').click(googleMapWrapper.centerOnMapData);
            
        },
        
        show: function (e) {
            
            console.log("Map show");
            if (!campusGoogleMap) {
                return;
            }
            var buildingId = e.view.params.buildingId;
            
            buildingAndFacilitiesMap.showBuildings(eventBuildingsJsonUrl, 'data/events-buildings.json',buildingId);
            buildingAndFacilitiesMap.showFacilities(foodAndDrinkFacilitiesJsonUrl, 'data/facilities-foodanddrink.json','styles/icons/foodanddrink.png');
            //Tell map that is now visible
            googleMapWrapper.showMap();
            
        },
        
        hide: function () {
            console.log("Map hide");
            if (googleMapWrapper){
                //Tell map that it is no longer visible
                googleMapWrapper.hideMap();
            }
            
        }
    };
}
)(window, jQuery);