
//EVENTS

(function (global, $j) {
    
    app = global.app = global.app || {};
    
    uob = global.uob = global.uob || {};
    
       
    var scheduleEventsListViewId = "open-day-schedule-events-view";
    var scheduleEventGroup = 'schedule';
    var favouriteEventGroup = 'favourite';

    //Initialise events data:
    document.addEventListener("deviceready", onDeviceReady, true);
    
    uob.eventsService = {
        
        _retrievedEventsData: null,
        _eventsDataSource: null,
        _eventsLocalStoragePrefix: "uob-events-",
            
        initialise: function ()
        {
            var that = this;
            app.application.showLoading();    
            var openDayEventsUrl = app.UoBEventsService + '?category=Open Day';
                    
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
                                console.log("Retrieved " + data.items.length + " event items");
                                app.enableLinks("eventServiceButton");
                                that._retrievedEventsData = data.items;
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
                that._eventsDataSource.fetch();
            }
        },
        findNonClashingScheduleDate: function(eventGroup, eventItem, minutesToChangeBy)
        {
        
            var that = this;
            newDate = new Date(kendo.parseDate(eventItem.ScheduleDate).getTime() + (minutesToChangeBy *60000));
            
            //Cycle through all currently selected events and check that there's not a clash
            var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
            
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
            
        },
        doesEventClashWithScheduledEvent: function(eventGroup, eventItem)
        {
            var that = this;
            var existingScheduleItems = that.getSelectedEventItems(eventGroup, true);
            
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
        },
        removeEventFromSelectedData: function(eventGroup, eventItem)
        {
            var that = this;
            var selectedEventData= that.getSelectedEventData(eventGroup);
            
            var contentId = eventItem.ContentId;
            
            if (selectedEventData)
            {
                console.log('Removing Content id: ' + eventItem.ContentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
                
                var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
                
                console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
                
                that.setSelectedEventData(eventGroup, eventsWithoutContentId);
            }
            else{
                console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
            }
        },
    
        addEventToSelectedData: function(eventGroup, eventItem)
        {
            var that = this;
            var selectedEventData= that.getSelectedEventData(eventGroup);
            
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
            
            that.setSelectedEventData(eventGroup, selectedEventData);
        
        },
    
        updateEventInSelectedData: function(eventGroup, eventItem, setScheduleDate)
        {
            var that = this;
            var existingSelectedEventData = that.getSelectedEventData(eventGroup);
            var newSelectedEventData = [];
            
            if (existingSelectedEventData){
                for (index = 0; index < existingSelectedEventData.length; ++index) {
                    
                    var selectedEventDataItem = existingSelectedEventData[index];
                    
                    if (selectedEventDataItem.ContentId === eventItem.ContentId)
                    {
                        if (setScheduleDate)
                        {
                            selectedEventDataItem.ScheduleDate = new Date((eventItem.ScheduleDate? kendo.parseDate(eventItem.ScheduleDate): kendo.parseDate(eventItem.StartDate)));
                        }
                    }
                    newSelectedEventData.push(selectedEventDataItem);
                }
            }
            
            that.setSelectedEventData(eventGroup, newSelectedEventData);
        },
        isContentIdSelected: function(eventGroup, contentId)
        {
            var that = this;
            return (that.getSelectedEventDataForContentId(eventGroup, contentId));
        },
        
        getSelectedEventDataForContentId: function(eventGroup, contentId)
        {
            var that = this;
            var selectedEventData = that.getSelectedEventData(eventGroup);
            
            var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
            if (eventsWithContentId && eventsWithContentId.length){
                
                return eventsWithContentId[0];
            }
            return null;
            
        },
        
        getEventItems: function (filteringFunction)
        {
            var that = this;
            if (that._retrievedEventsData){
                
                if (filteringFunction){
                     console.log("Retrieving items with filtering function");
                    return $j.grep(that._retrievedEventsData, filteringFunction);
                }
                else{
                 return that._retrievedEventsData;
                }
            }
            else{
                app.addErrorMessage("Request for data source before initilisation is complete");
            }
            return null;
         },
        
        getSelectedEventItems: function (eventGroup, setScheduleDate)
        {
            var that = this;
            var allEventItems = that.getEventItems();
            
            var selectedEventItems = [];
            
            if (!allEventItems){
                console.log("No event items to filter for selection");
                return;
            }

            var selectedEventData= that.getSelectedEventData(eventGroup);
            if (!selectedEventData){
                console.log("No selected events so nothing to retrieve");
                return selectedEventData;
            }
            
            for (index = 0; index < allEventItems.length; ++index) {
                var eventItem = allEventItems[index];
                var contentId = eventItem.ContentId;
                var selectedEventDataItem = that.getSelectedEventDataForContentId(eventGroup, contentId)
                if (selectedEventDataItem)
                {
                    //Supplement the event data with that from the event group:
                    if (setScheduleDate)
                    {
                        console.log("Set Schedule date if got one, otherwise set to Start Date");
                        that.setScheduleDate(eventItem, selectedEventDataItem.ScheduleDate);
                    }
                    selectedEventItems.push(eventItem);
                }
            }
            console.log("Returning " + selectedEventData.length + " selected events for " + eventGroup);
            return selectedEventItems;
        },

        setScheduleDate: function(eventItem, scheduleDate)
        {
            eventItem.ScheduleDate = new Date((scheduleDate? kendo.parseDate(scheduleDate): kendo.parseDate(eventItem.StartDate)));
        },
          
        setSelectedEventData: function(eventGroup, eventData)
        {
            var that = this;
            var stringEventData = JSON.stringify(eventData);
            localStorage.setItem(that.eventsLocalStoragePrefix + eventGroup, stringEventData);    
        },
        
        getSelectedEventData: function(eventGroup)
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

        uob.eventsService.initialise();
    }
      
    app.populateEventList = function (e){
        
        var eventsListViewId = "open-day-events-view";
        
        var activityFilter = $j("#event-activity-type-filter").data("kendoDropDownList");
        
        var filterFunction = null;
        
        if (!activityFilter){
        
            var activityTypes = [
                            {activityTypeDescription: "All", activityTypeKeyword: ""},
                            {activityTypeDescription: "Subject related", activityTypeKeyword: "Open-Day-Subject"},
                            {activityTypeDescription: "General", activityTypeKeyword: "Open-Day-General"}
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
                data: uob.eventsService.getEventItems(filterFunction),
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
                data:  uob.eventsService.getSelectedEventItems(favouriteEventGroup),
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
                data: uob.eventsService.getSelectedEventItems(scheduleEventGroup, true),
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
        
        var newDate = uob.eventsService.findNonClashingScheduleDate(scheduleEventGroup, eventItem, minutesToChangeBy);
                       
        if (newDate>= kendo.parseDate(eventItem.StartDate) && newDate <=kendo.parseDate(eventItem.EndDate))
        {
            console.log("Changing event schedule: " + eventItem.Title + " from " + eventItem.ScheduleDate + " " + newDate);
            uob.eventsService.setScheduleDate(eventItem, newDate);
            uob.eventsService.updateEventInSelectedData(scheduleEventGroup, eventItem, true);
        }
        else{
            console.log("Cannot change event: " + eventItem.Title + " to schedule: " + newDate);
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
                setupIconSpan(eventGroup, span, uob.eventsService.isContentIdSelected(eventGroup, eventItem.ContentId));
            }
            
        });
    }
    
    var setUpClickEventOnSelectedIcons=function(listViewId, eventGroup, dataSource, checkScheduleForClash)
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
                uob.eventsService.removeEventFromSelectedData(eventGroup, eventItem);
            }
            else{
                
                if (checkScheduleForClash)
                {
                    if (!uob.eventsService.doesEventClashWithScheduledEvent(eventGroup, eventItem))
                    {
                         return;
                    }
                }
                
                setupIconSpan(eventGroup, span, true);
                uob.eventsService.addEventToSelectedData(eventGroup, eventItem);
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
    
    
    
})(window, jQuery);
