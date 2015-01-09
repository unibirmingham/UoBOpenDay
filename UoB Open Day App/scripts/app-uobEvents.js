
//EVENTS

(function (global, $j) {
    
    var app,
        uob,
        scheduleEventGroup = 'schedule';
    global.app = global.app || {};
    
    app = global.app;
    app.uobOpenDay = app.uobOpenDay || {};
    app.uobRepository = app.uobRepository || {};
    app.uobEvents = app.uobEvents || {};
    
    global.uob = global.uob || {};
    uob = global.uob;
    uob.json = uob.json || {};
                
    var reportNoData = function(listViewId, noDataMessage)
    {
        var listView = $j("#" + listViewId).data("kendoMobileListView");
        if(listView && listView.items().length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
    var setupSelectorState = function (eventGroup, selector, isSelected)
    {
        var trueClass = eventGroup + "-true";
        if (isSelected)
        {
            $j(selector).addClass(trueClass);   
        }
        else{
             $j(selector).removeClass(trueClass);
        }
    };
     
    var setupSelectorValuesForEventGroup = function(listViewId, eventGroup, scheduledEvent, filterFunction)
    {
        console.log("Setup icons for " + eventGroup);
        //Clear out any existing true settings:
        var selectedClass = eventGroup + "-true";
        $j( "#" + listViewId).find("." + selectedClass).removeClass(selectedClass);
        
        var index;
        //Make selected items true:
        var selectedEventItems = app.uobRepository.eventsRepository.getSelectedEventItems(eventGroup, scheduledEvent, filterFunction);
        
        for (index = 0; index < selectedEventItems.length; ++index) {
            var selectedEventItem = selectedEventItems[index];
            var selectorHolder = $j('#' + listViewId + ' div[uob-content-id="' + selectedEventItem.ContentId + '"]');
            var selector = selectorHolder.find(".event-" + eventGroup);
            setupSelectorState(eventGroup, selector, true);
        }
    };
    
    var locationClick = function(event){

        var uid,
            listViewId,
            listView,
            dataSource,
            eventItem,
            buildingId;
        
        if (!app.uobMap.openDayMap.isInitialised()){
            //Just leave the map alone.
            return;
        }
        
        console.log("Select click start");
        listViewId = event.data.listViewId;
        listView = $j("#" + listViewId).data("kendoMobileListView");
        dataSource = listView.dataSource;
        
        uid = uob.kendo.getListViewUidForElement(this);
        
        eventItem = dataSource.getByUid(uid);
        
        if (eventItem && eventItem.BuildingIds && eventItem.BuildingIds.length>0){
            buildingId = eventItem.BuildingIds[0];
            app.application.navigate("#tabstrip-map?buildingId=" + buildingId);
        }
    
        return;
    }
    
    app.uobEvents.setupLocationClick = function (listViewId){
    
       var eventData = {listViewId: listViewId};
        
        $j("#" + listViewId).on('click', ".event-location", eventData, locationClick);
        
    }
    
    var showLocationClick = function(event)
    {
        var button,
            eventDetails,
            descriptionText,
            listView,
            dataSource,
            uid,
            eventItem;
        
        console.log("Location click start.");
        button = $j(this)
        eventDetails = button.parent().parent();
                
        listView = $j("#" + event.data.listViewId).data("kendoMobileListView");
		dataSource = listView.dataSource;
        uid = uob.kendo.getListViewUidForElement(eventDetails);
        eventItem = dataSource.getByUid(uid);
        
        if (eventItem){
            
            if (eventItem.Location){
                descriptionText = '<span class="event-location clickableButton">' + eventItem.Location + '</span>: ';
            }
            else{
                descriptionText = '';
            }
            
            descriptionText = descriptionText + eventItem.Description;
            
        	eventDetails.find("p").html(descriptionText);
		}
    	console.log("Location click end.");

    };
    
    var addEventToSelectedData = function(eventGroup, scheduledEvent, eventItem, selector, listViewId){
        
        var clashingEventsText = "",
            clashingEventsList = "",
            clashingEventIndex,
            clashingEventItem,
            alternativeEvents,
            alternativeEventsMessage;
        
        eventAddedResult = app.uobRepository.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent);
                        
        if(eventAddedResult.eventAdded)
        {
            setupSelectorState(eventGroup, selector, true);
        }
        else{
            
            if (eventAddedResult.clashingEvents){
             
                if (eventAddedResult.clashingEvents.length === 0){
                    clashingEventsText = "No space could be found in your schedule for the event. You need a space of " + eventItem.AttendanceDuration + 
                        " minutes in your schedule between " + eventItem.StartTimeInUk + " and " + eventItem.EndTimeInUk ;
                }
                else{
                    
                    //There is more than one clashing event so just list them:
                    for(clashingEventIndex in eventAddedResult.clashingEvents){
                        clashingEventItem = eventAddedResult.clashingEvents[clashingEventIndex];
                        if (clashingEventsList.length){
                            if (parseInt(clashingEventIndex)===eventAddedResult.clashingEvents.length-1){
                                clashingEventsList = clashingEventsList + " and ";    
                            }
                            else{
                                clashingEventsList = clashingEventsList + ", ";
                            }
                            
                        }
                        clashingEventsList = clashingEventsList + "'" + clashingEventItem.Title + " (" + clashingEventItem.getScheduledTimeDescription() + ")'";
                    }
                    
                    //Now see if we can find an alternative version of the same event which can go in
                    alternativeEvents = app.uobRepository.eventsRepository.findAlternativeVersionsOfTheEventThatWillFitInTheSchedule(eventGroup, eventItem, app.uobOpenDay.getFilterFunctionForOpenDayDate());
                    
                    //If there are alternative events then offer the first one:
                    if (alternativeEvents.length>0){
                        
                        var alternativeEvent = alternativeEvents[0];
                        //Take the first and offer it
                        alternativeEventsMessage = "Cannot add " + eventItem.getTitleAndTime() + " to the schedule as it clashes with " + clashingEventsList + ". There is another version of the event at "
                                + alternativeEvent.getTimeDescription() + " which can be added to the schedule. Do you want to add that instead?";
                        
                        navigator.notification.confirm(alternativeEventsMessage, 
                            function(buttonIndex){
                                var alternativeSelector;
                                if (buttonIndex===1){
                                   alternativeSelector = $j('#' + listViewId + ' div[uob-content-id="' + alternativeEvent.ContentId + '"] .event-' + eventGroup);
                                   addEventToSelectedData(eventGroup, scheduledEvent, alternativeEvent, alternativeSelector);
                                }
                            },
                            'Add alternative event?',['Add event','Cancel']);
                        
                        return;
                    }
                    
                    //If there's only one clashing event then offer to swap the event:
                    if (eventAddedResult.clashingEvents.length ===1){
                        
                        clashingEventItem = eventAddedResult.clashingEvents[0];
                        
                        clashingEventsText = "The event you are adding clashes with scheduled event '" + clashingEventItem.Title + " (" + clashingEventItem.getScheduledTimeDescription() + ")'. Do you want to remove it from the schedule "
                                        + " and add '" + eventItem.Title + " (" + eventItem.getScheduledTimeDescription() + ")' instead?'";
                        
                        navigator.notification.confirm(clashingEventsText, 
                            function(buttonIndex){
                                var clashingEventSelector;
                                if (buttonIndex===1){
                                   clashingEventSelector = $j('#' + listViewId + ' div[uob-content-id="' + clashingEventItem.ContentId + '"] .event-' + eventGroup);
                                   setupSelectorState(eventGroup, clashingEventSelector, false);
                                   app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, clashingEventItem);
                                   //Having cleared space in the schedule, we can call this again.
                                   addEventToSelectedData(eventGroup, scheduledEvent, eventItem, selector);
                                }
                            },
                            'Replace existing item in schedule?',['Replace','Cancel'])
                        
                        return;
                        
                    }
                                        
                    clashingEventsText = "This event clashes with: " + clashingEventsList;
                }
            }
            else{
                clashingEventsText = "Adding to schedule failed, but no clashing events were returned";
            }
            
            navigator.notification.alert("Cannot add '" + eventItem.getTitleAndTime() + "' to the schedule. " + clashingEventsText, null,"Schedule clash", 'OK');
        }
    }
        
    var selectorClick = function(event)
    {
        var selector=this;

        console.log("Select click start");
        var uid = uob.kendo.getListViewUidForElement(selector);
        
        var listViewId = event.data.listViewId;
        var listView = $j("#" + listViewId).data("kendoMobileListView");
        var dataSource = listView.dataSource;
        
        var scheduledEvent = event.data.scheduledEvent;
        var eventGroup = event.data.eventGroup;
        
        var eventItem = dataSource.getByUid(uid);

        
        if ($j(selector).hasClass(eventGroup + "-true"))
        {
            setupSelectorState(eventGroup, selector, false);
            app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
        }
        else{
            addEventToSelectedData(eventGroup, scheduledEvent, eventItem, selector, listViewId);
        }
        return false;
    };
        
    var displayEventList = function(resetScroller){
        
        uob.log.addLogMessage("Starting event list population");
        var today = new Date();
        var todayAsString = today.getDate() + "-" + (today.getMonth()+1) + "-" +  today.getFullYear();
        var eventsListViewId = "open-day-events-view";
       
        //Set up activity filter
        var activityTypeFilter = $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        
        if (!activityTypeFilter){
        
            $j("#event-activity-type-filter").kendoMobileButtonGroup({
                select: app.uobEvents.populateEventList,
                index: 0
            });            
            
            activityTypeFilter =  $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        }        
                
        var openDayDate = app.uobOpenDay.getOpenDayDateValue();
        console.log("Filter on date: " + openDayDate);
        var filterForDatasource = [{field: "StartDateInUk", operator: "eq", value:openDayDate}];
        
        var searchText = $j('#activity-search-text').val();
        if (searchText){
            console.log("Filter on search text: " + searchText);
            
            var filterForSearchText = {
                						logic: "or",
                						filters: [
                							{field: "Title", operator: "contains", value: searchText},
											{field: "Keywords", operator: "contains", value: searchText},
                							{field: "Description", operator: "contains", value: searchText}
                						]	
            }
            
            filterForDatasource.push(filterForSearchText);
        }
        
        //Make sure the activity type filters:
        var activityType = ""
        
        switch(activityTypeFilter.current().text()){
            case "Subject":
            	activityType = "Open-Day-Subject";
            	break;
            case "General":
            	activityType = "Open-Day-General";
            	break;
        }
        console.log("Filtering by Activity: " + activityType );
        
        if (activityType){
            console.log("Filter on activity: " + activityType);
            filterForDatasource.push({field: "Keywords", operator: "contains", value:activityType});
        }
        
        var eventsListView = $j("#" + eventsListViewId).data("kendoMobileListView");
        
        if (eventsListView)
        {

            //Check if data needs to be updated:
            if (!app.uobEvents.lastEventListPopulation || todayAsString !== app.uobEvents.lastEventListPopulation){
                $j('#activityStatus').text("Refreshing activities");
                var refreshEventItems = app.uobRepository.eventsRepository.getEventItems();
            	uob.log.addLogMessage("Retrieved " + refreshEventItems.length + " for data refresh");
                eventsListView.dataSource.data(refreshEventItems);
            }
            
            //Now check if the filter needs updating:
            var currentOpenDayDateFilter = '';
            var currentSearchTextFilter = '';
            var currentActivityTypeFilter = '';
            var currentFilter = eventsListView.dataSource.filter();
            var currentFilters = currentFilter.filters;
            for(var filterIndex in currentFilters)
            {
            	var filterEntry = currentFilters[filterIndex];
                
                //Activity Type value filter
                if (filterEntry.field === "Keywords"){
                    currentActivityTypeFilter = filterEntry.value;
                }
                
                if (filterEntry.filters){
					currentSearchTextFilter = filterEntry.filters[0].value;                    
                }
                if (filterEntry.field === "StartDateInUk"){
                    currentOpenDayDateFilter = filterEntry.value;
                }
            }
           
            if (currentOpenDayDateFilter===openDayDate && currentSearchTextFilter ===searchText && currentActivityTypeFilter === activityType)
            {
                console.log("No need to update filter as already in place updating schedule values");
                //The user could've changed the selected items in one of the other screens so reinitialise them:
                setupSelectorValuesForEventGroup(eventsListViewId, scheduleEventGroup, true);
            }
            else{
                $j('#activityStatus').text("Reloading activities");
            	eventsListView.dataSource.filter(filterForDatasource);
            }
            if (resetScroller)
            {
                app.application.scroller().reset();
            }
        }
        else{
            
        	uob.log.addLogMessage("Getting event items");
        	$j('#activityStatus').text("Loading activities");
            var eventItems = app.uobRepository.eventsRepository.getEventItems();
            uob.log.addLogMessage("Retrieved " + eventItems.length + " eventItems");
            
            var eventsListDataSource = new kendo.data.DataSource({
                data: eventItems,
                sort: [
                    { field: "Title", dir: "asc" },
                    { field: "StartDate", dir: "asc" }
                  ],
                pageSize: 1000,
                filter: filterForDatasource
            });
                    
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-template").text(),
                dataBound: function(){
                    uob.log.addLogMessage("Data bind start.");
                    setupSelectorValuesForEventGroup(eventsListViewId, scheduleEventGroup, true);
                    app.uobEvents.setupLocationClick(eventsListViewId);
                    $j('#activityStatus').text(this.items().length + " activities retrieved");
                    reportNoData(eventsListViewId, "No activities found.");
                    uob.log.addLogMessage("Data bind complete");
					
                } 
            });
            
            //Set up location click events
            var locationClickEventData = {
            			listViewId: eventsListViewId
        	}
            
        	$j("#" + eventsListViewId).on('click', '.show-location', locationClickEventData, showLocationClick);
            
       
            //Set up schedule click events
            var scheduleClickData = {listViewId: eventsListViewId,
            			scheduledEvent: true,
        				eventGroup: scheduleEventGroup};
        
            $j("#" + eventsListViewId).on('click', " .event-" + scheduleEventGroup, scheduleClickData, selectorClick);
        
            //Set the data of the population
            app.uobEvents.lastEventListPopulation = todayAsString;
            
            $("#activity-search-text" ).keypress(function( event ) {
      			if ( event.which === 13 ) {
                     event.preventDefault();
                     app.uobEvents.searchEvents();
      			}
  			});

       }
    };    
    
    app.uobEvents.lastEventListPopulation = "";
    
    app.uobEvents.populateEventList = function (e){
    
        displayEventList();
    };
    
    app.uobEvents.clearEventSearch = function()
    {
        $j('#activity-search-text').val("");
        displayEventList(true);
    };
    
    app.uobEvents.searchEvents = function()
    {
        displayEventList(true);
    };

})(window, jQuery);
