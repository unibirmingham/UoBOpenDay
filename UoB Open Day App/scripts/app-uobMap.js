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
    var eventBuildingsJsonUrl = app.uobSettings.EventsService + 'buildings/?folderPath=' + app.uobSettings.OpenDayEventsFolder + '&category=Open Day&startDate=01-Jan-' + (year-1) + '&endDate=31-Dec-' + year;
    var eventBuildingsLocalFile ='data/events-buildings.json';
    
    var valeBuildingsJsonUrl = app.uobSettings.MapsService + '54454/buildings/';
    var valeBuildingsLocalFile ='data/maps-vale-buildings.json';
    
    var foodAndDrinkFacilitiesJsonUrl = app.uobSettings.MapsService + '54448/facilities/?categoryKey=0/1/2836/2837/2839/2975';
    var foodAndDrinkFacilitiesLocalFile = 'data/facilities-foodanddrink.json';
    
    var foodAndDrinkBuildingsJsonUrl = app.uobSettings.MapsService + '54448/buildings/?categoryKey=0/1/2836/2837/2839/2975';
    var foodAndDrinkBuildingsLocalFile = 'data/buildings-foodanddrink.json';
    
    var googleMapWrapper = null;
    var campusGoogleMap = null;
    var edgbastonCampusMapData = null;
    var valeMapData = null;
    var buildingAndFacilitiesMap = null;
    
    var helpPointsLayerUrl =                         'https://www.google.com/maps/d/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kVz3BwO0IfOg&cid=mp&cv=Cf6yy4N3A9U.en_GB.';
    var busStopLayerUrl =                            'https://www.google.com/maps/d/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kdgAOrhp_RrE&cid=mp&cv=ETgVFIIic6w.en_GB.';
    var carParkLayerUrl =                            'https://www.google.com/maps/d/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&nl=1&lid=zc6rkPZ3mmwg.kU2Q_Iy_obQY&cid=mp&cv=Cf6yy4N3A9U.en_GB.';
    
    var walkingMapToValeFromBarberUrl =              'http://www.google.com/maps/d/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&lid=zc6rkPZ3mmwg.kLzEPhIVuH44';                                         
    var walkingMapToValeFromUniversityCentreUrl =     'http://www.google.com/maps/d/kml?mid=zc6rkPZ3mmwg.kH7qSgVOiyl4&lid=zc6rkPZ3mmwg.k8pImEuTDIZ4';
    
    var toggleMapOptions = function () {
        $j('#map-options').slideToggle(); 
    };
    
    var hideMapOptions = function () {
        if ($j('#map-options').is(':visible')){
            toggleMapOptions();
        }
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
        
    
    var createKmlLayer = function (kmlLayerUrl, toggleButtonId, layerDescription){
        
         var kmlLayer = new google.maps.KmlLayer(kmlLayerUrl,{preserveViewport: true, suppressInfoWindows: true});
         kmlLayer.setMap(campusGoogleMap);
         google.maps.event.addListener(kmlLayer, 'click', function(kmlEvent) {
             var latLng = kmlEvent.latLng;
             var title = kmlEvent.featureData.name;
             googleMapWrapper.setDestination(latLng, title);
          });  
        
        createKmlLayerToggleButton(kmlLayer, toggleButtonId, layerDescription);
        
        return kmlLayer;
          
    };
    
    var createFacilitiesToggleButton = function (facilitiesServiceUrl, buttonId, facilitiesDescription)
    {
        
        var initiallyVisible = buildingAndFacilitiesMap.getFacilitiesVisibility(facilitiesServiceUrl);
        
        setToggleButtonText(buttonId, facilitiesDescription, initiallyVisible);
        
        $j('#' + buttonId + ":not(.toggleButtonBound)").addClass("toggleButtonBound").click(function(){
            
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

            var carParkLayer;
            
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
                        edgbastonCampusMapData = mapItem;
                    }
                    if (mapItem.MapName.indexOf("Vale")!==-1){
                        valeMapData = mapItem;
                    }
                }
                if (!edgbastonCampusMapData) {
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
                
                //Now set up the layers and events on the map:
                $j('#map-show-options').click(toggleMapOptions);
                
                //Set up a swipe event to hide the options:
                $j("#map-options").kendoTouch({
                    dragstart: function (e) {
                        hideMapOptions();
                    }
                });
                
                google.maps.event.addListener(campusGoogleMap, 'click', hideMapOptions);

                var walkingMapToValeFromBarberLayer = new google.maps.KmlLayer(walkingMapToValeFromBarberUrl,{preserveViewport: true});
                createKmlLayerToggleButton(walkingMapToValeFromBarberLayer, 'map-toggle-walking-map-barber-insitute', 'Route from Barber Insitute');
                
                var walkingMapToValeFromQuadrangleLayer = new google.maps.KmlLayer(walkingMapToValeFromUniversityCentreUrl,{preserveViewport: true});
                createKmlLayerToggleButton(walkingMapToValeFromQuadrangleLayer, 'map-toggle-walking-map-quadrangle', 'Route from University Centre');
                
            }
            
            if (!googleMapWrapper){
                
                googleMapWrapper = new uob.google.GoogleMapWrapper(campusGoogleMap, edgbastonCampusMapData);    
                $j('#map-show-edgbaston-campus').click(googleMapWrapper.centerOnMapData);
                
                googleMapWrapper.addTrackingBounds(valeMapData.getLatLngBounds());

                createKmlLayer(helpPointsLayerUrl, 'map-toggle-help-points', 'Help points');                
                
                createKmlLayer(busStopLayerUrl, 'map-toggle-bus-stops', 'Bus stops');
                
                carParkLayer = createKmlLayer( carParkLayerUrl, 'map-toggle-car-parks', 'Car parks');
                                
                $j('#map-show-all-car-parks').click(function(){
                    
                    //Show the car parks if they're not visible:
                    if (!carParkLayer.getMap()){
                        carParkLayer.setMap(campusGoogleMap);
                        setKmlLayerToggleButtonText(carParkLayer, 'map-toggle-car-parks', 'Car parks');
                    }
                    googleMapWrapper.centerOnMapDataAndAdditionalKmlLayer(carParkLayer);
                });
                
                if (!carParkLayer.getStatus()){
                    //Car park layer isn't loaded so add it to the tracking bounds when it is
                    google.maps.event.addListenerOnce(carParkLayer, "status_changed", function() {
        				if (carParkLayer.getStatus() === google.maps.KmlLayerStatus.OK)
        				{
                            console.log("Car Park layer loaded so increasing tracking bounds");
        					googleMapWrapper.addTrackingBounds(carParkLayer.getDefaultViewport());
        				}
                    });
                }
                else{
                    console.log ("Car Park layer already loaded so increasing tracking bounds");
                    googleMapWrapper.addTrackingBounds(carParkLayer.getDefaultViewport());
                } 
                
                $j('#map-show-edgbaston-campus-and-vale').click(function(){
                    googleMapWrapper.centerOnMapDataAndAdditionalMapData(valeMapData);
                });
                
            }
        
            if (!buildingAndFacilitiesMap && googleMapWrapper){
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
            buildingAndFacilitiesMap.addBuildings(valeBuildingsJsonUrl, valeBuildingsLocalFile);
                        
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