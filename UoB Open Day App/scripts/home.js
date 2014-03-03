(function (global, $j) {
    
    app = global.app = global.app || {};
    
    uob = global.uob = global.uob || {};
    
    openDay = app.openDay = app.openDay || {};
    
    var startDatesLocalStorageName = 'uob-openday-startdates';
    var openDayDateLocalStorageName = 'uob-openday-date';
    
    var setStartDates = function(startDates)
    {
        openDay.startDates = startDates;
        
        startDateItems = [];
        
        for (var i in startDates)
        {
            var startDate = kendo.parseDate(startDates[i]);
            var startDateDescription = kendo.toString(startDate, 'ddd, d MMMM');
            
            var startDateItem = {
                startDate: startDate,
                description: startDateDescription
            };
            startDateItems.push(startDateItem);
        }
        
        app.application.hideLoading();
        //Show the open day date selector:
        $j('#tabstrip-home .open-day-date-selector').removeClass("open-day-date-selector");
        
        var dataSource = new kendo.data.DataSource({
                data: startDateItems,
                pageSize: 10000
            });
        
        $j("#open-day-date").kendoDropDownList({
                dataSource: dataSource,
                dataTextField: "description",
                dataValueField: "startDate", 
                change: function(e){
                    
                    openDay.date = this.value();
                    localStorage.setItem(openDayDateLocalStorageName, app.openDay.date);
                    
                }
            });
        
        var openDayDate = localStorage.getItem(openDayDateLocalStorageName);
        if (openDayDate){
            $j("#open-day-date").data('kendoDropDownList').value(openDayDate);
        }
        
    };
      
    
    var initialiseStartDate = function(){

        app.application.showLoading();
        var date = new Date();
        var year = date.getFullYear();

        var startDatesUrl = uob.url.EventsService + '/startdates/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    
        startDatesDataSource = new kendo.data.DataSource({
            transport: {
                read: {
                    url: startDatesUrl,
                    timeout: 10000,
                    dataType: "json"
                }
            },
            pageSize: 10000,
            change: function (data) {
                if (data.items && data.items.length>0){
                            console.log('Start dates received from service');
                            setStartDatesCache(data.items);
                            setStartDates(data.items);
                        }
                        else{
                            console.log("Error retrieving start dates: Nothing returned by service.");
                            getStartDatesFromCache();
                        }
                        
                        app.application.hideLoading();
                    },
                    error: function(e) {
                        var statusCode = e.status;
                        var errorThrown = e.errorThrown;
                        console.log("Error retrieving start dates: " + statusCode + " (" + errorThrown + ")");
                        getStartDatesFromCache();
                        app.application.hideLoading();
                    }
                });
        console.log("Requesting start dates data");
        startDatesDataSource.fetch();
            
    }
    
    var setStartDatesCache = function(startDates)
    {
        var stringStartDates = JSON.stringify(startDates);
        localStorage.setItem(startDatesLocalStorageName, stringStartDates);
    }
    
    var getStartDatesFromCache = function()
    {
        var stringStartDates = localStorage.getItem(startDatesLocalStorageName);
        if (stringStartDates){
            app.addErrorMessage("Start dates: Currently using local cache");
            var startDates = JSON.parse(stringStartDates);
            console.log("Setting start dates from local storage");
            setStartDates(startDates);
            return;
        }
        else
        {
            if (uob.testMode){
                console.log("Test mode: Looking for open day start dates from local file");
                var dataSource = new kendo.data.DataSource({
                    change: function (data) {
                        console.log('Retrieving Local start dates data');
                        if (data.items){
                            if (data.items.length>0){
                                app.addErrorMessage("Start dates data: Currently using local file");
                                setStartDates(data.items);
                            }
                            else{
                                 app.addErrorMessage("Error retrieving local start dates. No items found");   
                            }
                        }                      
                        app.application.hideLoading();
                    },
                    transport: {
                        read: {
                            url: "data/events-dates.json",
                            timeout: 5000,
                            dataType: "json"
                        }
                    }
                });
                dataSource.fetch();
            }
        }
    };
    

    //Initialise events data:
    document.addEventListener("deviceready", initialiseStartDate, true);
   
})(window, jQuery);