
//EVENTS

(function (global, $j) {
    
    app = global.app = global.app || {};
    
    uob = global.uob = global.uob || {};
    url = uob.url = uob.url || {};
    
       
    var scheduleEventsListViewId = "open-day-schedule-events-view";
    var scheduleEventGroup = 'schedule';
    var favouriteEventGroup = 'favourite';

    //Initialise events data:
    document.addEventListener("deviceready", onDeviceReady, true);
    
    uob.eventsRepository = {
        
        EventType : {
          ALLDAY: "AllDay",
          ALLDAYWITHDURATION: "AllDayWithDuration",
          FIXED: "Fixed"
        },
        
        _retrievedEventItems: null,
        _eventsDataSource: null,
        _eventsLocalStoragePrefix: "uob-events-",
        scheduleChunksInMinutes: 15,
        
        initialise: function ()
        {
            var that = this;
            app.application.showLoading();    
            var openDayEventsUrl = uob.url.EventsService + '?category=Open Day';
                    
            if (!that._eventsDataSource){
                that._eventsDataSource = new kendo.data.DataSource({
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
                                that._setEventItemsCache(data.items);
                                that._setRetrievedEventItems(data.items);
                            }
                            else{
                                console.log("Error retrieving events: No events returned by service.");
                                that._retrieveEventItemsFromCache();
                            }
                        }                      
                        app.application.hideLoading();
                    },
                    error: function(e) {
                        var statusCode = e.status;
                        var errorThrown = e.errorThrown;
                        console.log("Error retrieving events: " + statusCode + " (" + errorThrown + ")");
                        that._retrieveEventItemsFromCache();
                        app.application.hideLoading();
                    }
                });
                console.log("Requesting events data");
                that._eventsDataSource.fetch();
            }
        },
        _setEventItemsCache: function(eventItems)
        {
            var that = this;
            var stringEventItems = JSON.stringify(eventItems);
            localStorage.setItem(that._eventsLocalStoragePrefix + "-alldata", stringEventItems);
        },
        _retrieveEventItemsFromCache: function()
        {
            var that = this;
            var stringEventData = localStorage.getItem(that._eventsLocalStoragePrefix + "-alldata");
            if (stringEventData){
                app.addErrorMessage("Currently using events local cache");
                var eventItems = JSON.parse(stringEventData);
                console.log("Setting event items from local storage");
                that._setRetrievedEventItems(eventItems);
                return;
            }
            else
            {
                app.addErrorMessage("Retrieving events data from local");
                var dataSource = new kendo.data.DataSource({
                    change: function (data) {
                        console.log('Retrieving Local events data');
                        if (data.items){
                            if (data.items.length>0){
                                that._setRetrievedEventItems(data.items);
                            }
                            else{
                                 app.addErrorMessage("Error retrieving local events. No items found");   
                            }
                        }                      
                        app.application.hideLoading();
                    },
                    transport: {
                        read: {
                            url: "data/events.json",
                            timeout: 15000,
                            dataType: "json"
                        }
                    }
                });
                dataSource.fetch();
            }
        },
        
        _setRetrievedEventItems: function(eventItems){
            var that = this;
            console.log("Retrieved " + eventItems.length + " event items");
            app.enableLinks("eventServiceButton");
            that._setupEventItemsFunctions(eventItems);
            that._retrievedEventItems = eventItems;    
        },
        _setupEventItemsFunctions: function(eventItems)
        {
            var that = this;
            
            for(var i in eventItems)
            {
                var eventItem = eventItems[i];
                that._setupEventItemFunctions(eventItem);
                    
            }
        },
        
        _setupEventItemFunctions: function(eventItem)
        {
            var that = this;
            
            eventItem.getEventType = function()
                {
                    var eventItem = this;
                    if (eventItem 
                        && (Math.abs(kendo.parseDate(eventItem.EndDate)-kendo.parseDate(eventItem.StartDate)) / 36e5 > 6))
                    {
                        if (eventItem.AttendanceDuration ===0)
                        {
                            return that.EventType.ALLDAY;
                        }
                        else 
                        {
                            return that.EventType.ALLDAYWITHDURATION;   
                        }
                     }
                    return that.EventType.FIXED;
                }
                
                eventItem.isAllDayEvent = function()
                {
                    var eventItem = this;
                    var eventType = eventItem.getEventType();
                    if (eventType===that.EventType.ALLDAY ||eventType===that.EventType.ALLDAYWITHDURATION)
                    {
                        return true;
                    }
                    
                    return false;
                    
                }
            
                eventItem.getScheduleStartDate = function()
                {
                    var eventItem = this;
                    if (!eventItem._scheduleStartDate){
                        eventItem.setScheduleStartDate();   
                    }
                    return eventItem._scheduleStartDate;
                }
            
                eventItem.setScheduleStartDate =  function(scheduleStartDate)
                {
                    var eventItem = this;
                    eventItem._scheduleStartDate = new Date((scheduleStartDate? kendo.parseDate(scheduleStartDate): kendo.parseDate(eventItem.StartDate)));
                }
                
                //When does this end in the schedule
                eventItem.getScheduleEndDate = function()
                {
                    var eventItem = this;
                    if (eventItem.getEventType()===that.EventType.FIXED)
                    {
                        //Fixed events end when their end date is
                        return new Date(kendo.parseDate(eventItem.EndDate));
                    }
                    if (eventItem.getEventType()===that.EventType.ALLDAY)
                    {
                        //All day events effectively end at their schedule time -- they basically float free.
                        return eventItem.getScheduleStartDate();
                    }
                    //Events with attendance duration need that taking into account.
                    var scheduleEndDate = new Date(kendo.parseDate(eventItem.getScheduleStartDate()).getTime() + (eventItem.AttendanceDuration *60000));
                    return scheduleEndDate;
                }
                
                //Does this event's schedule clash with another event's schedule?
                eventItem.isClashingScheduledEvent = function(eventItem2){
                    var eventItem1 = this;
                    
                    // Two all-day events without attendance duration can co-exist even at the same time
                    if (eventItem1.getEventType()===that.EventType.ALLDAY && eventItem2.getEventType() === that.EventType.ALLDAY){
                        return false;
                    }
                    
                    var eventItem1ScheduleStartDate = eventItem1.getScheduleStartDate();
                    var eventItem1ScheduleEndDate = eventItem1.getScheduleEndDate();
                    
                    var eventItem2ScheduleStartDate = eventItem2.getScheduleStartDate();
                    var eventItem2ScheduleEndDate = eventItem2.getScheduleEndDate();
                    
                    //Otherwise, check if the schedule dates cross -- note that an event can start at the end time of a previous event.
                    if (eventItem1ScheduleStartDate>=eventItem2ScheduleStartDate && eventItem1ScheduleStartDate<eventItem2ScheduleEndDate)
                    {
                        console.log("Event: " + eventItem1.Title + " starts at " + eventItem1ScheduleStartDate + " which is during " + eventItem2.Title + " (" + eventItem2ScheduleStartDate + "-" + eventItem2ScheduleStartDate + ")");
                        return true;
                    }
                    if (eventItem1ScheduleEndDate>eventItem2ScheduleStartDate && eventItem1ScheduleEndDate<eventItem2ScheduleEndDate)
                    {
                         console.log("Event: " + eventItem1.Title + " ends at " + eventItem1ScheduleEndDate + " which is during " + eventItem2.Title + " (" + eventItem2ScheduleStartDate + "-" + eventItem2ScheduleStartDate + ")");   
                        return true;
                    }
                    if (eventItem1ScheduleStartDate<=eventItem2ScheduleStartDate && eventItem1ScheduleEndDate>eventItem2ScheduleEndDate)
                    {
                        console.log("Event: " + eventItem1.Title + " is from " + eventItem1ScheduleStartDate + "-" + eventItem1ScheduleEndDate + " which is around " + eventItem2.Title + " (" + eventItem2ScheduleStartDate + "-" + eventItem2ScheduleStartDate + ")");   
                        return true;   
                    }
                    
                    return false;
                    
                }

        },
        
        _cloneEventItem: function(eventItem){
          
            var that = this;
            
            var newEventItem = {
                                ContentId: eventItem.ContentId,
                                Title: eventItem.Title,
                                StartDate: eventItem.StartDate,
                                EndDate: eventItem.EndDate,
                                AttendanceDuration: eventItem.AttendanceDuration
            };
            
            that._setupEventItemFunctions(newEventItem);
            
            return newEventItem;
        },
        moveEventLaterInSchedule: function(eventGroup, eventItem)
        {
            var that = this;
            return that._moveEventInSchedule(eventGroup, eventItem, that.scheduleChunksInMinutes);
        },
        
        moveEventEarlierInSchedule: function(eventGroup, eventItem)
        {
            var that = this;
            return that._moveEventInSchedule(eventGroup, eventItem, 0-that.scheduleChunksInMinutes);
        },
        
        _moveEventInSchedule: function(eventGroup, eventItem, minutesToChangeBy)
        
        {
            var that = this;
            var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
            
            var newDate = that._getScheduleStartDateForItem(eventItem, selectedEventItems, minutesToChangeBy);
            
            if (newDate)
            {
                console.log("Changing event schedule: " + eventItem.Title + " from " + eventItem.getScheduleStartDate() + " to " + newDate);
                eventItem.setScheduleStartDate(newDate);
                uob.eventsRepository.updateEventInSelectedData(scheduleEventGroup, eventItem, true);
                return true;
            }
            else{
                console.log("Cannot change event: " + eventItem.Title + " to schedule: " + newDate);
                return false;
            }        
            
        },
        
        _getScheduleStartDateForItem: function (eventItem, selectedEventItems, minutesToChangeBy, initialScheduleStartDate){
            
            console.log("Looking for schedule date for: " + eventItem.Title + " with current schedule date: " + eventItem.getScheduleStartDate() + " minutes to change by: " + minutesToChangeBy );
            //Basically, We take a copy of the event item to test against and see if we can find somewhere in the schedule for it
            var that = this;
            
            var eventItemToTest = {
                                ContentId: eventItem.ContentId,
                                Title: eventItem.Title,
                                StartDate: eventItem.StartDate,
                                EndDate: eventItem.EndDate,
                                AttendanceDuration: eventItem.AttendanceDuration
            };
            
            that._setupEventItemFunctions(eventItemToTest);
            
            if (initialScheduleStartDate)
            {
                eventItemToTest.setScheduleStartDate(initialScheduleStartDate);    
            }
            else
            {
                eventItemToTest.setScheduleStartDate(eventItem.getScheduleStartDate());
            }
            
            if (minutesToChangeBy)
            {
                //Let's try moving it in the direction intended to start off with
                eventItemToTest.setScheduleStartDate(new Date(kendo.parseDate(eventItemToTest.getScheduleStartDate()).getTime() + (minutesToChangeBy *60000)));
            }
            else
            {
                minutesToChangeBy = that.scheduleChunksInMinutes;
            }

            var lastDate;
            
            do
            {
                lastDate = eventItemToTest.getScheduleStartDate();                
                
                for (index = 0; index <selectedEventItems.length; ++index) {
                
                    var selectedEventItem = selectedEventItems[index];
                    if (eventItemToTest.ContentId!==selectedEventItem.ContentId){
                        if (selectedEventItem.isClashingScheduledEvent(eventItemToTest))
                        {
                            console.log("Clashing Event: " + selectedEventItem.Title + " Schedule Start: " + selectedEventItem.getScheduleStartDate() + " Schedule End: " + selectedEventItem.getScheduleEndDate());
                            //As the event is not fixed we can try a different date:
                            if (minutesToChangeBy <0){
                                //we're going earlier so use the earliest start date
                                if (selectedEventItem.getScheduleStartDate()<eventItemToTest.getScheduleStartDate()){
                                    eventItemToTest.setScheduleStartDate(new Date(kendo.parseDate(selectedEventItem.getScheduleStartDate()).getTime() + (minutesToChangeBy *60000)));
                                }
                                else{
                                    eventItemToTest.setScheduleStartDate(new Date(kendo.parseDate(eventItemToTest.getScheduleStartDate()).getTime() + (minutesToChangeBy *60000)));   
                                }
                            }
                            else{
                                //We're going later so try a later date -- you can start at the scheduled end date as the next thing can start at the point the previous one ended
                                if (selectedEventItem.getScheduleStartDate()<selectedEventItem.getScheduleEndDate()){
                                    eventItemToTest.setScheduleStartDate (new Date(kendo.parseDate(selectedEventItem.getScheduleEndDate())));
                                }
                                else{
                                    eventItemToTest.setScheduleStartDate (new Date(kendo.parseDate(eventItemToTest.getScheduleStartDate()).getTime() + (minutesToChangeBy *60000)));
                                }
                            }
                            
                            console.log("New date to test for clashes: " + eventItemToTest.getScheduleStartDate());
                        }
                    }
                }
            //We carry on if there is a last date and If the last date is null then we drop out, or if it has a value which is different to the schedule date (as that means there's a new date to test).
            }while (lastDate && (kendo.parseDate(lastDate)!==kendo.parseDate(eventItemToTest.getScheduleStartDate())));
                        
            if (kendo.parseDate(eventItemToTest.getScheduleEndDate())>kendo.parseDate(eventItem.EndDate))
            {
                console.log("Cannot find a new schedule date which is before the end date -- returning null");
                lastDate = null;
            }
            
            if (kendo.parseDate(eventItemToTest.getScheduleStartDate())<kendo.parseDate(eventItem.StartDate))
            {
                console.log("Cannot find a new schedule date which after the start date -- returning null");
                lastDate = null;
            }
            
            return lastDate;
            
        },
                
        removeEventFromSelectedData: function(eventGroup, eventItem)
        {
            var that = this;
            var selectedEventData= that._getSelectedEventData(eventGroup);
            
            var contentId = eventItem.ContentId;
            
            if (selectedEventData)
            {
                console.log('Removing Content id: ' + eventItem.ContentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
                
                var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
                
                console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
                
                that._setSelectedEventData(eventGroup, eventsWithoutContentId);
            }
            else{
                console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
            }
        },
    
        addEventToSelectedData: function(eventGroup, eventItem, scheduledEvent)
        {
            
            var that = this;

            var scheduleStartDate = null;
            
            if(scheduledEvent){
                
                if (eventItem.getEventType()===that.EventType.FIXED){
                 
                    if (!that._checkAndResolveScheduleClashesForFixedEvent(eventGroup, eventItem))
                    {
                     
                        return false;
                        
                    }
                    
                }
                else{
                
                    var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
                    scheduleStartDate = that._getScheduleStartDateForItem(eventItem, selectedEventItems);
                    
                    if (!scheduleStartDate)
                    {
                        return false;
                    }
                }
            }

            var selectedEventData= that._getSelectedEventData(eventGroup);
            
            if (!selectedEventData)
            {
                console.log("Initialising selected event data for " + eventGroup);
                selectedEventData = [];
            }
            
            console.log('Adding content id ' + eventItem.ContentId + ' to ' + eventGroup);
            var selectedDataItem = {
                              ContentId: eventItem.ContentId  
            };
            
            if (scheduleStartDate)
            {
                selectedDataItem.ScheduleStartDate = scheduleStartDate;
            }
            
            selectedEventData.push(selectedDataItem);   
            
            that._setSelectedEventData(eventGroup, selectedEventData);
            
            return true;
        },
        
        
        _checkAndResolveScheduleClashesForFixedEvent: function(eventGroup, eventItem)
        {
         
            var that = this;
            var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
            
            //As fixed items cannot be moved we first check to see if there's already something in the schedule which clashes with it:
            var clashingEventItems = $j.grep(selectedEventItems, function(e){ return e.isClashingScheduledEvent(eventItem);});
            
            if (!clashingEventItems || clashingEventItems.length===0)
            {
                console.log ("No clashing event items for Event Item: " + eventItem.Title);
                return true;
            }
            
            
            var clashingAllDayEventItems = $j.grep(clashingEventItems, function(e){return e.isAllDayEvent();});
            
            if (!clashingAllDayEventItems || clashingAllDayEventItems.length!==clashingEventItems.length)
            {
                 console.log("Not all clashing event items are all day events so cannot resolve clash for event "+ eventItem.Title);
                return false;
            }
            
            console.log("All clashing dates with selected event item are all day -- testing to see if possible to move them out of the way");
            //All the clashing events are all day and so in theory are moveable -- if we get the non-clashing events and add the 
            //new event item we could see if we can get a schedule startdate for the clashing ones!
            var nonClashingEvents = $j.grep(selectedEventItems, function(e){return !e.isClashingScheduledEvent(eventItem);});
            
            nonClashingEvents.push(eventItem);
            
            var viableToShuffle = true;
            
            var newScheduleStartDates = [];

            //Create a new set of scheduled events which 
            for(var clashingIndex in clashingEventItems)
            {
                var clashingEventItem = clashingEventItems[clashingIndex];
                
                var newScheduleStartDate = that._getScheduleStartDateForItem(clashingEventItem, nonClashingEvents, null, clashingEventItem.StartDate);
                
                if (!newScheduleStartDate)
                {
                    viableToShuffle = false;
                    break;
                }
                
                //Add this item to the nonClashingEvents -- take a clone as we don't want to mess up real data:
                var eventItemCopy = that._cloneEventItem(clashingEventItem);
                
                eventItemCopy.setScheduleStartDate(newScheduleStartDate);
                
                nonClashingEvents.push(eventItemCopy);
                
                newScheduleStartDates.push(newScheduleStartDate);
                
            }
            if (!viableToShuffle)
            {
                console.log("Not viable to shuffle all day events to accomodate event: " + eventItem.Title + " " + eventItem.StartDate + " - " + eventItem.EndDate);
                return false;
            }

            //Now update the existing items with the new schedule dates.
            for(var clashingIndex2 in clashingEventItems)
            {
                var updateableClashingEventItem = clashingEventItems[clashingIndex2];
                
                updateableClashingEventItem.setScheduleStartDate(newScheduleStartDates[clashingIndex2]);
                
                that.updateEventInSelectedData(eventGroup, updateableClashingEventItem, true);
                
            }

            return true;
        },
        
        updateEventInSelectedData: function(eventGroup, eventItem, setScheduleStartDate)
        {
            var that = this;
            var existingSelectedEventData = that._getSelectedEventData(eventGroup);
            var newSelectedEventData = [];
            
            if (existingSelectedEventData){
                for (index = 0; index < existingSelectedEventData.length; ++index) {
                    
                    var selectedEventDataItem = existingSelectedEventData[index];
                    
                    if (selectedEventDataItem.ContentId === eventItem.ContentId)
                    {
                        if (setScheduleStartDate)
                        {
                            selectedEventDataItem.ScheduleStartDate = new Date(eventItem.getScheduleStartDate());
                        }
                    }
                    newSelectedEventData.push(selectedEventDataItem);
                }
            }
            
            that._setSelectedEventData(eventGroup, newSelectedEventData);
        },
        
        isContentIdSelected: function(eventGroup, contentId)
        {
            var that = this;
            return (that._getSelectedEventDataForContentId(eventGroup, contentId));
        },
        
        _getSelectedEventDataForContentId: function(eventGroup, contentId)
        {
            var that = this;
            var selectedEventData = that._getSelectedEventData(eventGroup);
            
            var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
            if (eventsWithContentId && eventsWithContentId.length){
                
                return eventsWithContentId[0];
            }
            return null;
            
        },
        
        getEventItems: function (filteringFunction)
        {
            var that = this;
            if (that._retrievedEventItems){
                
                if (filteringFunction){
                     console.log("Retrieving items with filtering function");
                    return $j.grep(that._retrievedEventItems, filteringFunction);
                }
                else{
                 return that._retrievedEventItems;
                }
            }
            else{
                app.addErrorMessage("Request for data source before initilisation is complete");
            }
            return null;
         },
        
        getSelectedEventItems: function (eventGroup, scheduledEvents)
        {
            console.log("Get selected event items for " + eventGroup);
            var that = this;
            var allEventItems = that.getEventItems();
            
            var selectedEventItems = [];
            
            if (!allEventItems){
                console.log("No event items to filter for selection");
                return selectedEventItems;
            }

            var selectedEventData= that._getSelectedEventData(eventGroup);
            if (!selectedEventData){
                console.log("No selected events so nothing to retrieve");
                return selectedEventItems;
            }
            
            
            for (index = 0; index < allEventItems.length; ++index) {
                var eventItem = allEventItems[index];
                var contentId = eventItem.ContentId;
                var selectedEventDataItem = that._getSelectedEventDataForContentId(eventGroup, contentId)
                if (selectedEventDataItem)
                {
                    //Supplement the event data with that from the event group:
                    if (scheduledEvents)
                    {
                        console.log("Set Schedule date if got one, otherwise set to Start Date");
                        eventItem.setScheduleStartDate(selectedEventDataItem.ScheduleStartDate);
                    }
                    selectedEventItems.push(eventItem);
                }
            }
           
            console.log("Returning " + selectedEventData.length + " selected events for " + eventGroup);
            return selectedEventItems;
        },

         
        _setSelectedEventData: function(eventGroup, eventData)
        {
            var that = this;
            var stringEventData = JSON.stringify(eventData);
            localStorage.setItem(that.eventsLocalStoragePrefix + eventGroup, stringEventData);    
        },
        
        _getSelectedEventData: function(eventGroup)
        {
            var that = this;
            var stringEventData = localStorage.getItem(that.eventsLocalStoragePrefix + eventGroup);
            if (stringEventData){
                return JSON.parse(stringEventData);
            }
            return [];
            
        }
        
    };
    
    
    function onDeviceReady() {

        uob.eventsRepository.initialise();
    }
      
    app.populateEventList = function (e){
        
        var eventsListViewId = "open-day-events-view";
        
        var activityFilter = $j("#event-activity-type-filter").data("kendoDropDownList");
        
        var filterFunction = null;
        
        if (!activityFilter){
        
            var activityTypes = [
                            {activityTypeDescription: "All", activityTypeKeyword: ""},
                            {activityTypeDescription: "Subject events", activityTypeKeyword: "Open-Day-Subject"},
                            {activityTypeDescription: "General events", activityTypeKeyword: "Open-Day-General"}
                            ];
            
            $j("#event-activity-type-filter").kendoDropDownList({
                dataTextField: "activityTypeDescription",
                dataValueField: "activityTypeKeyword",
                dataSource: activityTypes,
                change: app.populateEventList
            });            
        }        
        else{
            console.log("Filtering by " + activityFilter.value());
            filterFunction = function(e){
                var filter = activityFilter.value();
                if (filter){
                    return (e.Keywords.indexOf(filter) >=0);
                }
                //There's no filter
                return true;
            };
        }
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: uob.eventsRepository.getEventItems(filterFunction),
                pageSize: 10000
            });
        
        var eventsListView = $j("#" + eventsListViewId).data("kendoMobileListView");
        
        if (eventsListView)
        {
            console.log("Updating activities list view data source");
            //Copy the current search filter across:
            var filter = eventsListView.dataSource.filter();
            eventsListDataSource.filter(filter);
            eventsListView.setDataSource(eventsListDataSource);
        }
        else{
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
                    setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, eventsListDataSource, true);
                      
                } 
                
            });
       }
        
    };

    app.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var eventsListDataSource = new kendo.data.DataSource({
                data:  uob.eventsRepository.getSelectedEventItems(favouriteEventGroup),
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
                    setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, eventsListDataSource, true);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no favourite activities selected.");
                } 
            });
        }
        
    };
    
    app.populateScheduleEventList = function (e){
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: uob.eventsRepository.getSelectedEventItems(scheduleEventGroup, true),
                sort: [
                    { field: "getScheduleStartDate()", dir: "asc" },
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
            
            if (eventItem.isAllDayEvent())
            {
                console.log("Make move up visible");
                var data = {dataSource: dataSource};
                if (kendo.parseDate(eventItem.getScheduleStartDate())>kendo.parseDate(eventItem.StartDate)){
                    moveUp = true;
                }
                if (kendo.parseDate(eventItem.getScheduleEndDate())<kendo.parseDate(eventItem.EndDate)){
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
        
        var moveEvent;
        
        if ($j(span).hasClass('event-move-up'))
        {
            moveEvent = uob.eventsRepository.moveEventEarlierInSchedule(scheduleEventGroup, eventItem);
        }
        else{
            moveEvent = uob.eventsRepository.moveEventLaterInSchedule(scheduleEventGroup, eventItem);
        }

        if (!moveEvent)
        {
            navigator.notification.alert("Cannot move activity in schedule -- you may need to move some of your other events to fit it in.", null,"Schedule clash", 'OK');
        }
        
        app.populateScheduleEventList();
        
    };
        
    var reportNoData = function(listViewId, thisDataSourceData, noDataMessage)
    {
        if(thisDataSourceData.length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
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
                setupIconSpan(eventGroup, span, uob.eventsRepository.isContentIdSelected(eventGroup, eventItem.ContentId));
            }
            
        });
    }
    
    var setUpClickEventOnSelectedIcons=function(listViewId, eventGroup, dataSource, scheduledEvent)
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
                uob.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
            }
            else{
                if(uob.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent))
                {
                    setupIconSpan(eventGroup, span, true);
                }
                else{
                    navigator.notification.alert("Cannot add '" + eventItem.Title + "' (" + kendo.toString(kendo.parseDate(eventItem.StartDate), 'HH:mm') + " - " + kendo.toString(kendo.parseDate(eventItem.EndDate), 'HH:mm') + ") to the schedule -- please check your schedule for clashing events.", null,"Schedule clash", 'OK');
                }
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

})(window, jQuery);
