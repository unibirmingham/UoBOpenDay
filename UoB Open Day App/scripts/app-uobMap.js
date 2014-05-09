(function (global, $j) {
    
    var app = global.app = global.app || {};
    app.uobMap = app.uobMap || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url = uob.url || {};
    uob.map = uob.map || {};
    uob.google = uob.google || {};
    
    
    var date = new Date();
    var year = date.getFullYear();
    var eventBuildingsJsonUrl = app.uobSettings.EventsService + 'buildings/?folderPath=' + app.uobSettings.OpenDayEventsFolder + '&category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var eventBuildingsLocalFile ='data/events-buildings.json';
    
    var foodAndDrinkFacilitiesJsonUrl = app.uobSettings.MapsService + '54448/facilities/?categoryKey=0/1/2836/2837/2839/2975';
    var foodAndDrinkFacilitiesLocalFile = 'data/facilities-foodanddrink.json';
    
    var foodAndDrinkBuildingsJsonUrl = app.uobSettings.MapsService + '54448/buildings/?categoryKey=0/1/2836/2837/2839/2975';
    var foodAndDrinkBuildingsLocalFile = 'data/buildings-foodanddrink.json';
    
    var googleMapWrapper = null;
    var campusGoogleMap = null;
    var campusMapData = null;
    var buildingAndFacilitiesMap = null;
    
    
    app.uobMap.openDayMap = {
        
        initialise: function () {

            $j('#no-map').text('Initialising map ...');
            console.log("Map initialise");

            if (typeof google === "undefined"){
                $j('#no-map').text('Error initialising map: Google not found');
                return;
            } 

            if (!app.uobRepository.mapRepository || app.uobRepository.mapRepository.getStatus()===uob.json.JsonStatus.ERROR)
            {
                $j('#no-map').text('Error initialising map: No map repository found');
                return;     
            }
            
            var mapItems = app.uobRepository.mapRepository.getMaps();
            
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
        
        reinitialise: function(){
          
            //Function to force new instances of the uob data holding objects to be created:
            if (googleMapWrapper){
            
            	googleMapWrapper = new uob.google.GoogleMapWrapper(campusGoogleMap, campusMapData);
            }
            
            if (buildingAndFacilitiesMap){
                buildingAndFacilitiesMap =  new uob.map.BuildingAndFacilitiesMap(googleMapWrapper);
            }
            
        },
        
        show: function (e) {
            
            console.log("Map show");
            if (!campusGoogleMap) {
                return;
            }
            
            buildingAndFacilitiesMap.addBuildings(eventBuildingsJsonUrl, eventBuildingsLocalFile );
            buildingAndFacilitiesMap.addBuildings(foodAndDrinkBuildingsJsonUrl, foodAndDrinkBuildingsLocalFile);
            buildingAndFacilitiesMap.addFacilities(foodAndDrinkFacilitiesJsonUrl,foodAndDrinkFacilitiesLocalFile ,'styles/icons/foodanddrink.png');
            
            var buildingId = e.view.params.buildingId;
            if (buildingId){
            	buildingAndFacilitiesMap.setHighlightBuilding(buildingId);
            } else {
                buildingAndFacilitiesMap.clearHighlightBuilding();
            }
            
            //Tell map that it is now visible
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