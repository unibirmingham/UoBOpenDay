(function (global, $j) {
    
    app = global.app = global.app || {};
    
    uob = global.uob = global.uob || {};
    
    openDay = app.openDay = app.openDay || {};
    
    var openDayDateLocalStorageName = 'uob-openday-date';
    
    var date = new Date();
    var year = date.getFullYear();
    var startDatesUrl = uob.url.EventsService + '/startdates/?category=Open Day&startDate=01-Jan-' + year + '&endDate=31-Dec-' + year;
    var localDataFile = "data/events-dates.json";
    
    var initialiseStartDate = function(){

        app.application.showLoading();
        
        uob.json.getJSON ('Open Day Start Dates', startDatesUrl, localDataFile, startDatesSuccess, startDatesCacheSuccess, startDatesError)
            
    }
    
    var startDatesSuccess = function(data)
    {
         setStartDates(data);   
    }
    
    var startDatesCacheSuccess = function(data)
    {
        app.addCacheMessage("Start dates: Currently using local cache");
        setStartDates(data);
    }
    
    var startDatesError = function()
    {
        app.addErrorMessage("Unable to retrieve start date data");
        app.application.hideLoading();
    }
    
    var setStartDates = function(startDates)
    {
        startDateItems = [];
        
        for (var index = 0; index <startDates.length; ++index) {
            var startDateValue = startDates[index];
            var startDate = kendo.parseDate(startDateValue);
            var startDateDescription = kendo.toString(startDate, 'ddd, d MMMM');
            
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
        app.enableLinks('startDatesButton');
        app.application.hideLoading();
        
    };
    
    openDay.getOpenDayDate = function(){
        return localStorage.getItem(openDayDateLocalStorageName);
    }
    
    openDay.getOpenDayDateAsDate = function(){
        var openDayDate = openDay.getOpenDayDate();
        if (openDayDate)
        {
            return kendo.parseDate(openDayDate);
        }
        return null;
    }
    
    openDay.setOpenDayDate = function(openDayDate)
    {
        localStorage.setItem(openDayDateLocalStorageName, openDayDate);
    }
    
        
    //Initialise events data:
    document.addEventListener("deviceready", initialiseStartDate, true);
   
})(window, jQuery);