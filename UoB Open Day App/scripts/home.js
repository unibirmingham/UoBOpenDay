(function (global, $j) {
    
    var app = global.app = global.app || {};
    var openDay = app.openDay = app.openDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};      
    
    var openDayDateLocalStorageName = 'uob-openday-date';
    
    var date = new Date();
    var year = date.getFullYear();
    var startDatesUrl = uob.url.EventsService + '/startdates/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var localDataFile = "data/events-dates.json";
    
    openDay.initialiseStartDate = function(){

        app.application.showLoading();
        uob.log.addLogMessage("Initialising Start Dates");
        uob.json.getJSON ('Open Day Start Dates', startDatesUrl, localDataFile, startDatesSuccess, startDatesCacheSuccess, startDatesError)
            
    }
    
    var startDatesSuccess = function(data)
    {
         setStartDates(data);   
    }
    
    var startDatesCacheSuccess = function(data)
    {
        uob.log.addCacheMessage("Start dates: Currently using local cache");
        setStartDates(data);
    }
    
    var startDatesError = function()
    {
        uob.log.addErrorMessage("Unable to retrieve start date data");
        app.application.hideLoading();
    }
    
    var setStartDates = function(startDates)
    {
        startDateItems = [];
        
        for (var index = 0; index <startDates.length; ++index) {
            var startDateValue = startDates[index];
            var startDate = startDateValue;
            var startDateDescription = uob.date.formatDateAsUK(startDate,'ddd, DD MMM');
            
            var startDateItem = {
                startDate: startDate,
                description: startDateDescription
            };
            startDateItems.push(startDateItem);
        }
        
        var dataSource = new kendo.data.DataSource({
                data: startDateItems,
                pageSize: 10000
            });
        
        $j("#open-day-date").kendoDropDownList({
                dataSource: dataSource,
                dataTextField: "description",
                dataValueField: "startDate", 
                change: function(e){
                    openDay.setOpenDayDate(this.value());
                }
            });
        
        var openDayDate = openDay.getOpenDayDate();
        if (openDayDate){
            $j("#open-day-date").data('kendoDropDownList').value(openDayDate);
        }
        else{
            //Initialise the stored value to the default one:
            openDay.setOpenDayDate($j("#open-day-date").data('kendoDropDownList').value());
        }
        
        //Show the open day date selector:
        $j('#tabstrip-home .open-day-date-selector').removeClass("open-day-date-selector");
        uob.screen.enableLinks('startDatesButton');
        app.application.hideLoading();
        
    };
    
    openDay.getOpenDayDate = function(){
        return localStorage.getItem(openDayDateLocalStorageName);
    }
    
    openDay.getOpenDayDateAsDate = function(){
        var openDayDate = openDay.getOpenDayDate();
        if (openDayDate)
        {
            return uob.json.parseJsonDate(openDayDate);
        }
        return null;
    }
    
    openDay.setOpenDayDate = function(openDayDate)
    {
        localStorage.setItem(openDayDateLocalStorageName, openDayDate);
    }
    
        

   
})(window, jQuery);