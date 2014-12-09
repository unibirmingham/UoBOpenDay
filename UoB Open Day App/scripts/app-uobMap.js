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
    uob.google.apiLoader = uob.google.apiLoader || {};
    
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
    
    var helpPointsLayerUrl = 'https://mapsengine.google.com/map/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kVz3BwO0IfOg&cid=mp&cv=Cf6yy4N3A9U.en_GB.';
    var busStopLayerUrl =    'https://mapsengine.google.com/map/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kdgAOrhp_RrE&cid=mp&cv=Cf6yy4N3A9U.en_GB.';
    var carParkLayerUrl =    'https://mapsengine.google.com/map/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kU2Q_Iy_obQY&cid=mp&cv=Cf6yy4N3A9U.en_GB.';
    
    var toggleMapOptions = function () {
        $j('#map-options').slideToggle(); 
    };
    
    var setToggleButtonText = function (buttonId, description, currentlyShown) {
        
        var buttonSelector = '#' + buttonId + ' .buttonText';
        
        if (currentlyShown)
        {
            $j(buttonSelector).text("Hide " + description);
        }
        else{
            $j(buttonSelector).text("Show " + description);
        }
    };
    
    var createKmlLayerToggleButton = function (kmlLayer, buttonId, layerDescription)
    {
        $j('#' + buttonId).click(function(){
            if (kmlLayer.getMap()) {
                kmlLayer.setMap(null);
            }
            else{
                kmlLayer.setMap(campusGoogleMap);
            }
            setToggleButtonText(buttonId, layerDescription, kmlLayer.getMap());
        });
        setToggleButtonText(buttonId, layerDescription, kmlLayer.getMap());
    };
        
    var createFacilitiesToggleButton = function (facilitiesServiceUrl, buttonId, facilitiesDescription)
    {
        
        var initiallyVisible = buildingAndFacilitiesMap.getFacilitiesVisibility(facilitiesServiceUrl);
        
        setToggleButtonText(buttonId, facilitiesDescription, initiallyVisible);
        
        $j('#' + buttonId).click(function(){
            
            var visible = buildingAndFacilitiesMap.getFacilitiesVisibility(facilitiesServiceUrl);
            
            if (visible) {
                buildingAndFacilitiesMap.hideFacilities(facilitiesServiceUrl);
            }
            else{
                buildingAndFacilitiesMap.showFacilities(facilitiesServiceUrl);
            }
            setToggleButtonText(buttonId, facilitiesDescription, !visible);
        });
        
    }
    
    app.uobMap.openDayMap = {
        
        setMapText: function (mapText, isWarning){
            $j('#no-map').text(mapText);
            if (isWarning){
                uob.log.addLogWarning(mapText);
            }
        },
        
        isInitialised: function () {

            app.uobMap.openDayMap.setMapText('Initialising map ...');
            console.log("Map initialise");
            
            if (!uob.google.apiLoader.isApiLoaded()){
                
                if (!uob.web.is3GOrBetter()){
                    app.uobMap.openDayMap.setMapText('Google not found: Please return to the menu, connect to the internet and refresh the data', true);
                }
                else{
                    app.uobMap.openDayMap.setMapText('Google not found: Please return to the menu and refresh the data', true);
                }
                
                return false;
                
            }
            
            if (!app.uobRepository.mapRepository || app.uobRepository.mapRepository.getStatus()===uob.json.JsonStatus.ERROR)
            {
                app.uobMap.openDayMap.setMapText('Error initialising map: No map repository found', true);
                return false;     
            }
            
            if (!campusGoogleMap){
            
                var mapItems = app.uobRepository.mapRepository.getMaps();
                
                if (!mapItems)
                {
                    app.uobMap.openDayMap.setMapText('Error initialising map: No campus map data found', true);
                    return false;     
                }
                
                for (var i in mapItems) {
                    //Setup the lat lng bounds on the uob maps:
                    var mapItem = mapItems[i];
                    if (mapItem.MapName.indexOf("Edgbaston") !== -1) {
                        campusMapData = mapItem;
                    }
                }
                if (!campusMapData) {
                    app.uobMap.openDayMap.setMapText('Error initialising map: Edgbaston Campus Map data not found', true);
                    return false;
                }
                
                if (!uob.web.is3GOrBetter()){
                    app.uobMap.openDayMap.setMapText('Error initialising map: Web connection of 3G or higher required to initialise map. Please connect to the internet and revisit this map', true);
                    return false;
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
                
            }
            
            if (!googleMapWrapper){
                googleMapWrapper = new uob.google.GoogleMapWrapper(campusGoogleMap, campusMapData);    
                $j('#map-show-edgbaston-campus').click(googleMapWrapper.centerOnMapData);
                
                
                
                $j('#map-show-options').click(toggleMapOptions);

                var helpPointsLayer = new google.maps.KmlLayer(helpPointsLayerUrl,{preserveViewport: true});
                helpPointsLayer.setMap(campusGoogleMap);
                
                createKmlLayerToggleButton( helpPointsLayer, 'map-toggle-help-points', 'Help points');                
                
                var busStopLayer = new google.maps.KmlLayer(busStopLayerUrl,{preserveViewport: true});
                busStopLayer.setMap(campusGoogleMap);
                
                createKmlLayerToggleButton(busStopLayer, 'map-toggle-bus-stops', 'Bus stops');                
                
                var carParkLayer = new google.maps.KmlLayer(carParkLayerUrl,{preserveViewport: true});
                carParkLayer.setMap(campusGoogleMap);
                createKmlLayerToggleButton( carParkLayer, 'map-toggle-car-parks', 'Car parks');                
                                
                $j('#map-show-all-car-parks').click(function(){
                    if (!carParkLayer.getMap()){
                        carParkLayer.setMap(campusGoogleMap);
                        setKmlLayerToggleButtonText(carParkLayer, 'map-toggle-car-parks', 'Car parks');
                    }
                    var latLngBounds = carParkLayer.getDefaultViewport();
                    campusGoogleMap.fitBounds(latLngBounds);
                });
            }
        
            if (!buildingAndFacilitiesMap){
                buildingAndFacilitiesMap = new uob.map.BuildingAndFacilitiesMap(googleMapWrapper);    
            }
            return true;
            
        },
        
        show: function (e) {
            
            if (!app.uobMap.openDayMap.isInitialised())
            {
                return;
            }
            
            console.log("Map show");
            
            buildingAndFacilitiesMap.addBuildings(eventBuildingsJsonUrl, eventBuildingsLocalFile );
            buildingAndFacilitiesMap.addBuildings(foodAndDrinkBuildingsJsonUrl, foodAndDrinkBuildingsLocalFile);
            buildingAndFacilitiesMap.addFacilities(foodAndDrinkFacilitiesJsonUrl,foodAndDrinkFacilitiesLocalFile ,'styles/icons/foodanddrink.png');
            createFacilitiesToggleButton(foodAndDrinkFacilitiesJsonUrl, 'map-toggle-refreshments', 'Refreshments');
            
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