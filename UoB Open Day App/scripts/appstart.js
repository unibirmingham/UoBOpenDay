(function (global, $j) {
    
    
    var app = global.app = global.app || {};
    app.uobRepository = app.uobRepository || {};
    app.uobOpenDay = app.uobOpenDay || {};
    app.uobSettings = app.uobSettings || {};
    
    var uob = global.uob = global.uob || {};
    uob.data = uob.data || {};

    uob.events = uob.events || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url= uob.url || {};
    uob.map= uob.map || {};
    
    var date = new Date();
    var year = date.getFullYear();
    var openDayEventsUrl = app.uobSettings.EventsService + '?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var openDayLocalFile = 'data/events.json';
    
    var startDatesUrl = app.uobSettings.EventsService + '/startdates/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var startDatesLocalFile = "data/events-dates.json";
    
    var initialisationList = ["Web Connection", "Start Dates", "Maps", "Events"];
    
    var webConnection;
    
    var onDeviceReady= function()
    {
        
        $j.support.cors = true;
        
        displayInitialisationMessage();
        
        checkWebConnection("webConnectionButton");
        
        //Set up repositories:
    
    	app.uobRepository.startDateRepository = new uob.events.StartDateRepository("Open Day Start Dates",startDatesUrl, startDatesLocalFile, startDateRepositoryInitialised);
        
        app.uobRepository.mapRepository = new uob.map.MapRepository("Maps", app.uobSettings.MapsService, 'data/maps.json', mapRepositoryInitialised);
        
        app.uobRepository.eventsRepository =  new uob.events.EventsRepository("Open Day Events", openDayEventsUrl, openDayLocalFile, eventsRepositoryInitialised);
        
        //Now initialise them:
        app.uobRepository.startDateRepository.initialise();

        app.uobRepository.mapRepository.initialise();
        
        app.uobRepository.eventsRepository.initialise();
        
    };
    
    var showStatus = function()
    {
        var status;
        
        if (app.uobRepository.startDateRepository.getStatus() === uob.json.JsonStatus.LIVE
			&& app.uobRepository.mapRepository.getStatus() === uob.json.JsonStatus.LIVE
        	&& app.uobRepository.eventsRepository.getStatus() === uob.json.JsonStatus.LIVE
        	&& webConnection===true){
            uob.log.addLogInfo("All data retrieved from internet and web connection in place");
            return;
        }
        
        if (app.uobRepository.startDateRepository.hasData()
			&& app.uobRepository.mapRepository.hasData()
        	 && app.uobRepository.eventsRepository.hasData()) {
            //Application has data but at least some is cached:
        	if (webConnection) {
            	status = "Using cached data: Restart application for latest data";
        	} else {
            	status = "Using cached data: Restart application with internet connection of 3G or higher for latest data and maps functionality.";
            }
        } else {
            //At least some part of the app doesn't have even cached data:
            status = "Limited data available: Restart application with an internet connection of 3G or higher";
        }

        if (status) {
            uob.log.addLogWarning(status);
            $j('#status-message').html("<p>" + status + "</p>");
        }
    };
    var displayInitialisationMessage = function()
    {
    	var i;
        var message;
        message = '';
        
        if (initialisationList.length>0){
            message = "Initialising: ";
            for (i = 0; i < initialisationList.length; i += 1) {
                message = message + initialisationList[i];
                if (i<initialisationList.length-1){
                	message = message + ", ";
                }
            }
            message = "<p>" + message + "</p>";
        }
        
        $j('#loading-message').html(message);		
        
        if (!message){
            //Initialisation has completed:
            showStatus();
        }
        
	};
    
    var initialised = function(itemInitialised)
    {
        var index;
        
		index = $j.inArray(itemInitialised, initialisationList);date
		if (index>=0){
            initialisationList.splice(index, 1);
        }
        uob.log.addLogMessage("Initialised: " + itemInitialised);
		displayInitialisationMessage();
    };
    
    var checkWebConnection = function(){

        if (uob.web.is3GOrBetter()){
            uob.log.addLogMessage("3G or better internet connection is present");
            uob.screen.enableLinks("webConnectionButton");
            webConnection = true;
        } else {
            webConnection = false;
            uob.log.addLogWarning("No web connection");
        }
        initialised("Web Connection");
    };
            
    var mapRepositoryInitialised = function()
    {
        if (app.uobRepository.mapRepository.hasData()){
            uob.screen.enableLinks("mapRepositoryButton");
        }
        initialised("Maps");
    };

    var startDateRepositoryInitialised = function()
    {
                
        if (app.uobRepository.startDateRepository.hasData())
        {
        
            var dataSource = new kendo.data.DataSource({
                    data: app.uobRepository.startDateRepository.getStartDates(),
                    pageSize: 10000
                });
            
            $j("#open-day-date").kendoDropDownList({
                    dataSource: dataSource,
                    dataTextField: "description",
                    dataValueField: "startDate", 
                    change: function(e){
                        app.uobOpenDay.setOpenDayDate(this.value());
                    }
                });
            
            var openDayDate = app.uobOpenDay.getOpenDayDate();
            if (openDayDate){
                $j("#open-day-date").data('kendoDropDownList').value(openDayDate);
            }
            else{
                //Initialise the stored value to the default one:
                app.uobOpenDay.setOpenDayDate($j("#open-day-date").data('kendoDropDownList').value());
            }
            
            //Show the open day date selector:
            $j('#tabstrip-home .open-day-date-selector').removeClass("open-day-date-selector");
            uob.screen.enableLinks('startDatesButton');
        }
        initialised("Start Dates");
    };
    
    var eventsRepositoryInitialised = function()
    {
        if (app.uobRepository.eventsRepository.hasData())
        {
            uob.screen.enableLinks("eventsRepositoryButton");
        }
        initialised("Events");
    };
    
    document.addEventListener("deviceready", onDeviceReady, true);
    
    
})(window, jQuery);
