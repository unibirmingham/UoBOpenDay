(function (global, $j) {
    
    
    var app = global.app = global.app || {};
    app.repository = app.repository || {};
    app.openDay = app.openDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.data = uob.data || {};

    uob.events = uob.events || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url= uob.url || {};
    uob.map= uob.map || {};
    
    var date = new Date();
    var year = date.getFullYear();
    var openDayEventsUrl = uob.url.EventsService + '?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var openDayLocalFile = 'data/events.json';
    
    var startDatesUrl = uob.url.EventsService + '/startdates/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var startDatesLocalFile = "data/events-dates.json";
    
    var initialisationList = ["Web Connection", "Website", "Start Dates", "Maps", "Events"];
    
    var onDeviceReady= function()
    {
        
        $j.support.cors = true;
        
        displayInitialisationMessage();
        
        checkWebConnection("webConnectionButton");
        
        checkWebsite();
        
        //Set up repositories:
    
    	app.repository.startDateRepository = new uob.events.StartDateRepository("Open Day Start Dates",startDatesUrl, startDatesLocalFile, startDateRepositoryInitialised);
        
        app.repository.mapRepository = new uob.map.MapRepository("Maps", uob.url.MapsService, 'data/maps.json', mapRepositoryInitialised);
        
        app.repository.eventsRepository =  new uob.events.EventsRepository("Open Day Events", openDayEventsUrl, openDayLocalFile, eventsRepositoryInitialised);
        
        //Now initialise them:
        app.repository.startDateRepository.initialise();

        app.repository.mapRepository.initialise();
        
        app.repository.eventsRepository.initialise();
        
    };
    var initialised = function(itemInitialised)
    {
        var index;
        
		index = $j.inArray(itemInitialised, initialisationList);
		if (index>=0){
            initialisationList.splice(index, 1);
        }
		displayInitialisationMessage();
    };
    
    var displayInitialisationMessage = function()
    {
    	var i;
        var message;
        message = '';
        
        if (initialisationList.length){
            message = "Initialising: ";
            for (i = 0; i < initialisationList.length; i += 1) {
                message = message + initialisationList[i];
                if (i<initialisationList.length-1){
                	message = message + ", ";
                }
            }
        }
        
        $j('#loading-message').text(message);		
        
	};
        
    var checkWebConnection = function(){

        if (uob.web.is3GOrBetter()){
            uob.log.addLogMessage("3G or better internet connection is present");
            uob.screen.enableLinks("webConnectionButton");
        } else {
            uob.log.addLogMessage("No web connection");
        }
        initialised("Web Connection");
    };
    
    var checkWebsite = function()
    {
        uob.web.checkUrl("University of Birmingham Website", 'http://' + uob.url.WebSite  + '/index.aspx', checkWebsiteCallback);
    };
        
    var checkWebsiteCallback = function(success)
    {
        if (success){
            uob.screen.enableLinks("webSiteButton");
    	}
        initialised("Website");
	};
    
    var mapRepositoryInitialised = function()
    {
        if (app.repository.mapRepository.hasData()){
            uob.screen.enableLinks("mapRepositoryButton");
        }
        initialised("Maps");
    };

    var startDateRepositoryInitialised = function()
    {
                
        if (app.repository.startDateRepository.hasData())
        {
        
            var dataSource = new kendo.data.DataSource({
                    data: app.repository.startDateRepository.getStartDates(),
                    pageSize: 10000
                });
            
            $j("#open-day-date").kendoDropDownList({
                    dataSource: dataSource,
                    dataTextField: "description",
                    dataValueField: "startDate", 
                    change: function(e){
                        app.openDay.setOpenDayDate(this.value());
                    }
                });
            
            var openDayDate = app.openDay.getOpenDayDate();
            if (openDayDate){
                $j("#open-day-date").data('kendoDropDownList').value(openDayDate);
            }
            else{
                //Initialise the stored value to the default one:
                app.openDay.setOpenDayDate($j("#open-day-date").data('kendoDropDownList').value());
            }
            
            //Show the open day date selector:
            $j('#tabstrip-home .open-day-date-selector').removeClass("open-day-date-selector");
            uob.screen.enableLinks('startDatesButton');
        }
        initialised("Start Dates");
    };
    
    var eventsRepositoryInitialised = function()
    {
        if (app.repository.eventsRepository.hasData())
        {
            uob.screen.enableLinks("eventsRepositoryButton");
        }
        initialised("Events");
    };
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    
})(window, jQuery);
