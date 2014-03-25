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
    var _eventBuildingsJsonUrl = uob.url.EventsService + 'buildings/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    
    var _foodAndDrinkFacilitiesJsonUrl = uob.url.MapsService + '54448/facilities/?categoryKey=0/1/2836/2837/2839/2975';
    
    var _googleMapWrapper = null;
    var _campusGoogleMap = null;
    var _campusMapData = null;
    var _buildingAndFacilitiesMap = null;
    
    app.campusMapService = {
        
        helpPointsLayer: new google.maps.KmlLayer('http://mapsengine.google.com/map/kml?mid=zVpAqNihyIqo.kUp2n30TUjHY&amp;lid=zVpAqNihyIqo.k484h8JBYbe8',{preserveViewport: true, suppressInfoWindows: true}),
        
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
                    _campusMapData = mapItem;
                }
            }
            if (!_campusMapData) {
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

            _campusGoogleMap = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
            
            _campusGoogleMap.mapTypes.set('Campus Map', campusMapStyle);
            _campusGoogleMap.setMapTypeId('Campus Map');
            
            _googleMapWrapper = new uob.google.googleMapWrapper(_campusGoogleMap, _campusMapData);
            
            app.campusMapService.showHelpPoints();
            
            _buildingAndFacilitiesMap = new uob.map.buildingAndFacilitiesMap(_googleMapWrapper);
            
            _googleMapWrapper.showMap();
            
            $j('#map-return-to-campus').click(_googleMapWrapper.centerOnMapData);
            
        },
        
        showHelpPoints: function(){this.helpPointsLayer.setMap(_campusGoogleMap);},

        show: function (e) {
            
            console.log("Map show");
            if (!_campusGoogleMap) {
                return;
            }
            var buildingId = e.view.params.buildingId;
            
            _buildingAndFacilitiesMap.showBuildings(_eventBuildingsJsonUrl, 'data/events-buildings.json',buildingId);
            _buildingAndFacilitiesMap.showFacilities(_foodAndDrinkFacilitiesJsonUrl, 'data/facilities-foodanddrink.json','styles/icons/foodanddrink.png');
            //Tell map that is now visible
            _googleMapWrapper.showMap();
            
        },
        
        hide: function () {
            console.log("Map hide");
            if (_googleMapWrapper){
                //Tell map that it is no longer visible
                _googleMapWrapper.hideMap();
            }
            
        }
    };
}
)(window, jQuery);