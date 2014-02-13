
//EVENTS

(function (global, $j) {
    
    app = global.app = global.app || {};
    
    var _retrievedEventsData;
    var _eventsDataSource;
    var eventsLocalStoragePrefix = "uob-events-";
    
    var scheduleEventsListViewId = "open-day-schedule-events-view";
    var scheduleEventGroup = 'schedule';
    var favouriteEventGroup = favouriteEventGroup;

    //Initialise events data:
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        initialiseEventsDataSource();
    }
    
    var initialiseEventsDataSource = function ()
    {
        app.application.showLoading();    
        var openDayEventsUrl = app.UoBEventsService + '?category=Open Day';
                
        if (!_eventsDataSource){
            _eventsDataSource = new kendo.data.DataSource({
                transport: {
                    read: {
                        url: openDayEventsUrl,
                        timeout: 15000,
                        dataType: "json"
                    }
                },
                pageSize: 10000,
                change: function (data) {
                    console.log('Change event');
                    if (data.items){
                        if (data.items.length>0){
                            console.log("Retrieved " + data.items.length + " items");
                            app.enableLinks("webServiceButton");
                            _retrievedEventsData = data.items;
                        }
                        else{
                             app.addErrorMessage("Error retrieving events. No items found");   
                        }
                    }                      
                    app.application.hideLoading();
                },
                error: function(e) {
                    var statusCode = e.status;
                    var errorThrown = e.errorThrown;
                    app.addErrorMessage("Error retrieving events: " + statusCode + " (" + errorThrown + ")");
                    app.application.hideLoading();
                }
            });
            console.log("Requesting events data");
            _eventsDataSource.fetch();
        }
    };
    
    var getEventItems = function ()
    {
        if (_retrievedEventsData){
             return _retrievedEventsData;
        }
        else{
            app.addErrorMessage("Request for data source before initilisation is complete");
        }
        return null;
     };
    
    app.populateEventList = function (e){
        
        var eventsListViewId = "open-day-events-view";
        var eventsListDataSource = new kendo.data.DataSource({
                data: getEventItems(),
                pageSize: 10000
            });
        
        $j("#" + eventsListViewId).kendoMobileListView({
            dataSource: eventsListDataSource,
            template: $j("#events-template").text(),
             filterable: {
                    field: "Title",
                    operator: "contains"
                },
            dataBound: function(){
                setUpIcons(eventsListViewId, favouriteEventGroup, eventsListDataSource);
                setUpClickEventOnSelectedIcons(eventsListViewId, favouriteEventGroup, eventsListDataSource);
                  setUpIcons(eventsListViewId, scheduleEventGroup, eventsListDataSource);
                setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, eventsListDataSource, validateSelectionOfScheduledEvent);
                  
            } 
            
        });
        
    };

    app.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var eventsListDataSource = new kendo.data.DataSource({
                data:  getSelectedEventItems(favouriteEventGroup),
                pageSize: 10000
            });
        
        if ($j("#" + eventsListViewId).data("kendoMobileListView"))
        {
            console.log("Updating favourites list view data source");
            $j("#" + eventsListViewId).data("kendoMobileListView").setDataSource(eventsListDataSource);
        }
        else{
            
            console.log("Initialising favourites list view");
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-template").text(),
                dataBound: function(){
                    hideIcons(eventsListViewId, favouriteEventGroup);
                    setUpIcons(eventsListViewId, scheduleEventGroup,eventsListDataSource);
                    setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, eventsListDataSource, validateSelectionOfScheduledEvent);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no favourite activities selected.");
                } 
            });
        }
        
    };
    
    app.populateScheduleEventList = function (e){
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: getSelectedEventItems(scheduleEventGroup),
                sort: [
                    { field: "ScheduleDate", dir: "asc" },
                    { field: "Title", dir: "asc" }
                  ],
                pageSize: 10000
            });
        
        if ($j("#" + scheduleEventsListViewId).data("kendoMobileListView"))
        {
            console.log("Updating schedule list view data source");
            $j("#" + scheduleEventsListViewId).data("kendoMobileListView").setDataSource(eventsListDataSource);
        }
        else{
            console.log("Initialising schedules list view");
            $j("#" + scheduleEventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-schedule-template").text(),
                dataBound: function(){
                    hideIcons(scheduleEventsListViewId, favouriteEventGroup);
                    hideIcons(scheduleEventsListViewId, scheduleEventGroup);
                    setupMoveUpAndDown(scheduleEventsListViewId, this.dataSource);
                    reportNoData(scheduleEventsListViewId, this.dataSource.data(), "You have no scheduled activities selected.");
                } 
                
            });
        }    
    };
    
    var setupMoveUpAndDown = function(listViewId, dataSource){
        
        console.log("Setup move up and down icons");
        $j("#" + listViewId + " div.schedule-movers").each(function() {
            
            var div = this;

            var uid = $j(div).parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            var moveUp = false;
            var moveDown = false;
            
            if (isAllDayEvent(eventItem))
            {
                console.log("Make move up visible");
                var data = {dataSource: dataSource};
                if (kendo.parseDate(eventItem.ScheduleDate)>kendo.parseDate(eventItem.StartDate)){
                    moveUp = true;
                }
                if (kendo.parseDate(eventItem.ScheduleDate)<kendo.parseDate(eventItem.EndDate)){
                    moveDown = true;
                }
            }
            
            if (moveUp)
            {
                $j(div).find('span.event-move-up').removeClass('moveup-false').addClass('moveup-true').on('click',data, scheduleMoveClick);
            }
            else{
                //Hide and remove click bindings
                $j(div).find('span.event-move-up').removeClass('moveup-true').addClass('moveup-false').off('click');
            }
            
            if (moveDown){
                 $j(div).find('span.event-move-down').removeClass('movedown-false').addClass('movedown-true').on('click', data, scheduleMoveClick);
            }
            else{
                $j(div).find('span.event-move-down').removeClass('movedown-true').addClass('movedown-false').off('click');      
            }
             
        });
    }
    
    var scheduleMoveClick = function(event)
    {
        var span=this;
        var currentDiv = $j(span).parent().parent().parent();
        var dataSource = event.data.dataSource;   
        var uid = $j(currentDiv).attr('data-uid');
        
        var eventItem = dataSource.getByUid(uid);
        
        var minutesToChangeBy;
        
        if ($j(span).hasClass('event-move-up'))
        {
            minutesToChangeBy = -15;
        }
        else{
            minutesToChangeBy = +15;
        }
        
        var newDate = findNonClashingScheduleDate(scheduleEventGroup, eventItem, minutesToChangeBy);
                       
        if (newDate>= kendo.parseDate(eventItem.StartDate) && newDate <=kendo.parseDate(eventItem.EndDate))
        {
            console.log("Changing event schedule: " + eventItem.Title + " from " + eventItem.ScheduleDate + " " + newDate);
            setScheduleDate(eventItem, newDate);
            updateEventInSelectedData(scheduleEventGroup, eventItem);
        }
        else{
            console.log("Cannot change event: " + eventItem.Title + " to schedule: " + newDate);
        }        
        
        app.populateScheduleEventList();
        
    };
    
    var findNonClashingScheduleDate = function(eventGroup, eventItem, minutesToChangeBy)
    {
        
        newDate = new Date(kendo.parseDate(eventItem.ScheduleDate).getTime() + (minutesToChangeBy *60000));
        
        //Cycle through all currently selected events and check that there's not a clash
        var selectedEventItems = getSelectedEventItems(eventGroup);
        
        var newDateToTestForClashes;
        do
        {
            if (newDateToTestForClashes)
            {
                newDate = newDateToTestForClashes;
            }
            else{
                newDateToTestForClashes = newDate;
            }
            
            for (index = 0; index <selectedEventItems.length; ++index) {
            
                var selectedEventItem = selectedEventItems[index];
                if (eventItem.ContentId!==selectedEventItem.ContentId){
                    if (isClashingDate(selectedEventItem, newDate))
                    {
                        newDateToTestForClashes = new Date(kendo.parseDate(newDate).getTime() + (minutesToChangeBy *60000));
                        console.log("New date to test for clashes: " + newDateToTestForClashes);
                    }
                }
            }            
        }
     
        while (newDate!==newDateToTestForClashes);
        
        return newDate;
        
    }
    
        
    var reportNoData = function(listViewId, thisDataSourceData, noDataMessage)
    {
        if(thisDataSourceData.length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
    var validateSelectionOfScheduledEvent = function(eventGroup, eventItem)
    {
        
        var existingScheduleItems = getSelectedEventItems(eventGroup);
        
        if (isAllDayEvent(eventItem)){
                console.log("User has scheduled an all day event so no need to look for clashes");
                return true;
            }
        else{
            var clashingEvents = $j.grep(existingScheduleItems, function(e){ 
                
                if (isAllDayEvent(e)){
                    console.log("This is an all day event so cannot clash.");
                    return false;
                }
                
                return isClashingEvent(eventItem, e);
            });
            
            if (clashingEvents && clashingEvents.length >0)
            {
                navigator.notification.alert("Event clashes with another event in the schedule", null,"Schedule clash", 'OK');
                return false;
            }
        }
        return true;
    }
    
    var hideIcons = function (listViewId, eventGroup)
    {
        $j("#" + listViewId + " span.event-" + eventGroup).hide();    
    }
    
    var setUpIcons = function(listViewId, eventGroup, dataSource){
        
        console.log("Setup favourite icons");
        $j("#" + listViewId + " span.event-" + eventGroup).each(function() {
            
            var span = this;

            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (eventItem){
                setupIconSpan(eventGroup, span, isContentIdSelected(eventGroup, eventItem.ContentId));
            }
            
        });
    }
    
    var setUpClickEventOnSelectedIcons=function(listViewId, eventGroup, dataSource, selectionValidationFunction)
    {
        console.log("Set up favourite icons");
        var selectedEventSpans = $j("#" + listViewId + " span.event-" + eventGroup);
        
        console.log("Selected " + eventGroup + " spans = " + selectedEventSpans.length);
        
        $j(selectedEventSpans).click(function(){
            var span=this;
            
            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if ($j(span).hasClass(eventGroup + "-true"))
            {
                setupIconSpan(eventGroup, span, false);
                removeEventFromSelectedData(eventGroup, eventItem);
            }
            else{
                
                if (typeof selectionValidationFunction === 'function')
                {
                    if (!selectionValidationFunction(eventGroup, eventItem))
                    {
                         return;
                    }
                }
                
                setupIconSpan(eventGroup, span, true);
                addEventToSelectedData(eventGroup, eventItem);
            }
            
        });
    };

    var setupIconSpan = function (eventGroup, span, isSelected)
    {
        var trueClass = eventGroup + "-true";
        var falseClass = eventGroup  + "-false";
        
        if (isSelected)
        {
            $j(span).removeClass(falseClass);
            $j(span).addClass(trueClass);   
        }
        else{
             $j(span).removeClass(trueClass);
            $j(span).addClass(falseClass);
        }
    }
    
    var removeEventFromSelectedData = function(eventGroup, eventItem)
    {
        var selectedEventData= getSelectedEventData(eventGroup);
        
        var contentId = eventItem.ContentId;
        
        if (selectedEventData)
        {
            console.log('Removing Content id: ' + eventItem.ContentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
            
            var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
            
            console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
            
            setSelectedEventData(eventGroup, eventsWithoutContentId);
        }
        else{
            console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
        }
    }
    
    var addEventToSelectedData = function(eventGroup, eventItem)
    {
        var selectedEventData= getSelectedEventData(eventGroup);
        
        if (!selectedEventData)
        {
            console.log("Initialising selected event data for " + eventGroup);
            selectedEventData = [];
        }
        console.log('Adding content id ' + eventItem.ContentId + ' to ' + eventGroup);
        var selectedDataItem = {
                          ContentId: eventItem.ContentId  
        };
        selectedEventData.push(selectedDataItem);   
        
        setSelectedEventData(eventGroup, selectedEventData);
    
    }
    
    var updateEventInSelectedData = function(eventGroup, eventItem)
    {
     
        var existingSelectedEventData = getSelectedEventData(eventGroup);
        var newSelectedEventData = [];
        
        if (existingSelectedEventData){
            for (index = 0; index < existingSelectedEventData.length; ++index) {
                
                var selectedEventDataItem = existingSelectedEventData[index];
                
                if (selectedEventDataItem.ContentId === eventItem.ContentId)
                {
                    if (eventGroup===scheduleEventGroup)
                    {
                        selectedEventDataItem.ScheduleDate = new Date((eventItem.ScheduleDate? kendo.parseDate(eventItem.ScheduleDate): kendo.parseDate(eventItem.StartDate)));
                    }
                }
                newSelectedEventData.push(selectedEventDataItem);
            }
        }
        
        setSelectedEventData(eventGroup, newSelectedEventData);
    }
    
    var isAllDayEvent = function (eventItem)
    {
        if (eventItem 
            && (Math.abs(
                        kendo.parseDate(eventItem.EndDate)-kendo.parseDate(eventItem.StartDate)
                        ) / 36e5 > 6)
            )
        {
            return true;
        }
        return false;
    }
    
    var isClashingEvent = function(eventItem1, eventItem2)
    {
         if (isAllDayEvent(eventItem1) || isAllDayEvent(eventItem2)){
            console.log("One event is an all day event so cannot clash.");
            return false;
        }

        return (eventItem1.StartDate>=eventItem2.StartDate && eventItem1.StartDate<eventItem2.EndDate)
            ||
            (eventItem1.EndDate>=eventItem2.StartDate && eventItem1.EndDate<eventItem2.EndDate)
            ||
            (eventItem1.StartDate<=eventItem2.StartDate && eventItem1.EndDate>=eventItem2.EndDate);

        
    }
    
    var isClashingDate = function(eventItem, date)
    {
        if (isAllDayEvent(eventItem)){
            return false;
        }
        if (kendo.parseDate(date)>=kendo.parseDate(eventItem.StartDate) && kendo.parseDate(date) <kendo.parseDate(eventItem.EndDate))
        {
            return true;
        }
        return false;
    }
    
    var isContentIdSelected = function(eventGroup, contentId)
    {
        return (getSelectedEventDataForContentId(eventGroup, contentId));
    }
    
    var getSelectedEventDataForContentId = function(eventGroup, contentId)
    {
        var selectedEventData = getSelectedEventData(eventGroup);
        
        var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
        if (eventsWithContentId && eventsWithContentId.length){
            
            return eventsWithContentId[0];
        }
        return null;
        
    }
       
    var getSelectedEventItems = function (eventGroup)
    {
        var allEventItems = getEventItems();
        
        var selectedEventItems = [];
        
        if (!allEventItems){
            console.log("No event items to filter for selection");
            return;
        }

        var selectedEventData= getSelectedEventData(eventGroup);
        if (!selectedEventData){
            console.log("No selected events so nothing to retrieve");
            return selectedEventData;
        }
        
        for (index = 0; index < allEventItems.length; ++index) {
            var eventItem = allEventItems[index];
            var contentId = eventItem.ContentId;
            var selectedEventDataItem = getSelectedEventDataForContentId(eventGroup, contentId)
            if (selectedEventDataItem)
            {
                //Supplement the event data with that from the event group:
                if (eventGroup===scheduleEventGroup)
                {
                    console.log("Set Schedule date if got one, otherwise set to Start Date");
                    setScheduleDate(eventItem, selectedEventDataItem.ScheduleDate);
                }
                selectedEventItems.push(eventItem);
            }
        }
        console.log("Returning " + selectedEventData.length + " selected events for " + eventGroup);
        return selectedEventItems;
    }

    var setScheduleDate = function(eventItem, scheduleDate)
    {
        eventItem.ScheduleDate = new Date((scheduleDate? kendo.parseDate(scheduleDate): kendo.parseDate(eventItem.StartDate)));
    }
      
    var setSelectedEventData = function(eventGroup, eventData)
    {
        var stringEventData = JSON.stringify(eventData);
        localStorage.setItem(eventsLocalStoragePrefix + eventGroup, stringEventData);    
    }
    
    var getSelectedEventData = function(eventGroup)
    {
        var stringEventData = localStorage.getItem(eventsLocalStoragePrefix + eventGroup);
        if (stringEventData){
            return JSON.parse(stringEventData);
        }
        return [];
        
    }
    
})(window, jQuery);
