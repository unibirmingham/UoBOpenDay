(function (global, $j) {
    
    
    var app = global.app = global.app || {};
    app.uobRepository = app.uobRepository || {};
    app.uobOpenDay = app.uobOpenDay || {};
    app.uobSettings = app.uobSettings || {};
    app.uobMap = app.uobMap || {};
    app.uobApplicationName = "UoB Open Day";
        
    var uob = global.uob = global.uob || {};
    uob.data = uob.data || {};

    uob.events = uob.events || {};
    uob.google = uob.google || {};
    uob.google.apiLoader = uob.google.apiLoader || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};
    uob.url= uob.url || {};
    uob.map= uob.map || {};
    uob.app = uob.app || {};
    
    var date = new Date();
    var year = date.getFullYear();
    var openDayEventsUrl = app.uobSettings.EventsService + '?folderPath=' + app.uobSettings.OpenDayEventsFolder + '&category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var openDayLocalFile = 'data/events.json';
    
    var startDatesUrl = app.uobSettings.EventsService + 'startdates/?folderPath=' + app.uobSettings.OpenDayEventsFolder + '&category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var startDatesLocalFile = "data/events-dates.json";
    
    var initialisationList = [];
    
    var webConnection;
    
    app.initialiseDataWithCheck = function()
    {
        if (uob.web.is3GOrBetter()){
            navigator.notification.confirm('Do you wish to refresh the application data?', confirmInitialiseData, 'Refresh data?',['Refresh', 'Cancel']);    
        }else{
            navigator.notification.alert("Cannot refresh data as the current connection is not 3G or better.", null,"Refresh unavailable", 'OK');
        }
    }
    
    var onDeviceReady= function()
    {
       
        $j.support.cors = true;
        
        initialiseData();
        
    };
    
    var initialiseData = function(){
    
        setupButtons();
        $j('#status-message').html("");
        
        app.uobEvents.lastEventListPopulation = '';
        
        initialisationList = ["Web Connection", "Start Dates", "Maps", "Events"];
        
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
        
    }
   
    var confirmInitialiseData = function(buttonIndex)
    {
        if (buttonIndex===1)
        {
            if (uob.google.apiLoader.isApiLoaded()){
                 initialiseData();   
            }
            else{
                //We need to force the reloading of the google javascript files:
                uob.app.reloadApplication();
            }
        }
    }
    
    var setupButtons = function()
    {
        $j('.activitiesButton, .scheduleButton, .mapButton').addClass('eventsRepositoryButton');
        $j('.activitiesButton, .scheduleButton').addClass('startDatesButton');
        $j('.mapButton, .feedbackButton').addClass('webConnectionButton');
        $j('.mapButton').addClass('mapRepositoryButton');
        $j('.initialiseHidden').removeClass('initialiseHidden');
    }
    
    var showStatus = function()
    {
        var status='';
                
        if (app.uobRepository.startDateRepository.getStatus() === uob.json.JsonStatus.LIVE
			&& app.uobRepository.mapRepository.getStatus() === uob.json.JsonStatus.LIVE
        	&& app.uobRepository.eventsRepository.getStatus() === uob.json.JsonStatus.LIVE
        	&& webConnection===true){
            uob.log.addLogInfo("All data retrieved from internet and web connection in place.");
                
            return;
        }else{
        
            if (app.uobRepository.startDateRepository.hasData()
    			&& app.uobRepository.mapRepository.hasData()
            	 && app.uobRepository.eventsRepository.hasData()) {
                //Application has data but at least some is cached:
                status = "Currently using cached data.";
            } else {
                //At least some part of the app doesn't have even cached data:
                status = "Limited data available.";
            }
            
            if (!webConnection)
            {
                //Give a reminder about the web connection.
                status = status + " An internet connection of 3G or higher is required for latest data and maps.";
            }
            
		}
        
        if (status) {
            
            uob.log.addLogWarning(status);
            
            status = "<p>" + status + " Click button below to refresh data." + "</p>";
        }
        $j('#status-message').html(status);
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
        var startDateData,
            dataSource,
            storedOpenDayDate,
            openDayDateToSet,
            i;
        
        if (app.uobRepository.startDateRepository.hasData())
        {
            startDateData = app.uobRepository.startDateRepository.getStartDates();
            
            dataSource = new kendo.data.DataSource({
                    data: startDateData,
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
            
            //Check that the stored open day date is an available option.
            storedOpenDayDate = app.uobOpenDay.getOpenDayDate();
            
            for (i = 0; i < startDateData.length; i++) {
                if (startDateData[i].startDate===storedOpenDayDate){
                    openDayDateToSet = storedOpenDayDate;
                    break;
                }
            }

            if (openDayDateToSet){
                //Set the current displayed value to match that from storage
                $j("#open-day-date").data('kendoDropDownList').value(openDayDateToSet);
            }
            else{
                //Initialise the stored value to the default value:
                app.uobOpenDay.setOpenDayDate($j("#open-day-date").data('kendoDropDownList').value());
            }
            
            //Now show the open day date selector:
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
