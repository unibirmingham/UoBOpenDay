
//EVENTS

(function (global, $j) {
    
    var app,
        uob,
        scheduleEventsListViewId = "open-day-schedule-events-view",
        scheduleEventGroup = 'schedule';
    global.app = global.app || {};
    
    app = global.app;
    app.uobOpenDay = app.uobOpenDay || {};
    app.uobRepository = app.uobRepository || {};
    app.uobEvents = app.uobEvents || {};
    
    global.uob = global.uob || {};
    uob = global.uob;
    uob.json = uob.json || {};
        
    var getOpenDayDateValue = function()
    {
        var openDayDate = app.uobOpenDay.getOpenDayDateAsDate();
        var openDayDateInUk = uob.date.formatDateAsUK(openDayDate, 'YYYY-MM-DD');
        return openDayDateInUk;
    };
    
    var getFilterFunctionForOpenDayDate = function()
    {
        var openDayDateInUk = getOpenDayDateValue();
        console.log("Creating filter function for: " + openDayDateInUk);
        var filterFunction = function(eventItem){
            return eventItem.StartDateInUk=== openDayDateInUk;
        };
        
        return filterFunction;
    };
        
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

    var setupSelectorsForEventGroup = function(listViewId, eventGroup, scheduledEvent, filterFunction){
        
        console.log("Setup icons for " + eventGroup);
        setupSelectorValuesForEventGroup(listViewId, eventGroup, scheduledEvent, filterFunction);
    };
    
    var locationClick = function(event){

        var uid,
            listViewId,
            listView,
            dataSource,
            containingItem,
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
        
        containingItem = $j(this).parent().parent().parent();
        uid = containingItem.attr('data-uid');
        
        if (!uid){
            //try a level higher:
            uid = containingItem.parent().attr('data-uid');
        }
        
        eventItem = dataSource.getByUid(uid);
        
        if (eventItem && eventItem.BuildingIds && eventItem.BuildingIds.length>0){
            buildingId = eventItem.BuildingIds[0];
            app.application.navigate("#tabstrip-map?buildingId=" + buildingId);
        }
    
        return;
    }
    
    var setupLocationClick = function (listViewId){
    
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
        uid = eventDetails.parent().attr('data-uid');
        eventItem = dataSource.getByUid(uid);
        
        if (eventItem){
            
            if (eventItem.Location){
                descriptionText = '<span class="event-location">' + eventItem.Location + '</span>: ';
            }
            else{
                descriptionText = '';
            }
            
            descriptionText = descriptionText + eventItem.Description;
            
        	eventDetails.find("p").html(descriptionText);
		}
    	console.log("Location click end.");

    };
    
    var selectorClick = function(event)
    {
        var selector=this;

        console.log("Select click start");
        var uid = $j(selector).parent().parent().attr('data-uid');
        
        var listViewId = event.data.listViewId;
        var listView = $j("#" + listViewId).data("kendoMobileListView");
        var dataSource = listView.dataSource;
        
        var scheduledEvent = event.data.scheduledEvent;
        var eventGroup = event.data.eventGroup;
        
        var eventItem = dataSource.getByUid(uid);
        var clashingEventsText = "";
        var clashingEventIndex;
        var clashingEventItem;
        
        if ($j(selector).hasClass(eventGroup + "-true"))
        {
            setupSelectorState(eventGroup, selector, false);
            app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
        }
        else{
            
            eventAddedResult = app.uobRepository.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent);
                        
            if(eventAddedResult.eventAdded)
            {
                setupSelectorState(eventGroup, selector, true);
            }
            else{
                
                if (eventAddedResult.clashingEvents){
                 
                     var selectedEvents = app.uobRepository.eventsRepository.getSelectedEventItems(eventGroup, scheduledEvent);   
                    
                    if (eventAddedResult.clashingEvents.length === selectedEvents.length){
                        clashingEventsText = "No space could be found in your schedule for the event. You need a space of " + eventItem.AttendanceDuration + 
                            " minutes in your schedule between " + eventItem.StartTimeInUk + " and " + eventItem.EndTimeInUk ;
                    }
                    else{
                        for(clashingEventIndex in eventAddedResult.clashingEvents){
                            clashingEventItem = eventAddedResult.clashingEvents[clashingEventIndex];
                            if (clashingEventsText.length){
                                clashingEventsText = clashingEventsText + ", "
                            }
                            clashingEventsText = clashingEventsText + "'" + clashingEventItem.Title + " (" + clashingEventItem.getScheduledTimeDescription() + ")'";
                        }
                        clashingEventsText = "This event clashes with: " + clashingEventsText;
                    }
                }
                else{
                    clashingEventsText = "Adding to schedule failed, but no clashing events were returned";
                }
                
                navigator.notification.alert("Cannot add '" + eventItem.getTitleAndTime() + "' to the schedule. " + clashingEventsText, null,"Schedule clash", 'OK');
            }
        }
        return false;
    };
  
    var removeClick = function(event)
    {
        
        var uid = $j(this).parent().parent().attr('data-uid');
        var listViewId = event.data.listViewId;
        var eventGroup = event.data.eventGroup;
        var reloadFunction = event.data.reloadFunction;
		var listView = $j("#" + listViewId).data("kendoMobileListView");
        var dataSource = listView.dataSource;
        var eventItem = dataSource.getByUid(uid);
        
        if (eventItem){
        
            navigator.notification.confirm("Are you sure you wish to remove the activity '" + eventItem.getTitleAndTime() + "'?", 
            	function(buttonIndex){
                    if (buttonIndex===1){
    					app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
                        reloadFunction();
                    }
                },
            'Remove activity?','Remove, Cancel');
        }
    	
    };
    
    var setupRemoveClick = function (listViewId, eventGroup, reloadFunction){
    
       var eventData = {listViewId: listViewId,
				eventGroup: eventGroup,
       			reloadFunction: reloadFunction};
        
        $j("#" + listViewId).on('click', " .remove-" + eventGroup,eventData, removeClick);
        
    };
    
    var setupMoveEarlierAndLater = function(listViewId, dataSource){
        
        uob.log.addLogMessage("Setup move up and down icons");
                
        $j("#" + listViewId + " div.schedule-movers").each(function() {
            
            var div = this;

            var uid = $j(div).parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            var moveEarlier = false;
            var moveLater = false;
            
            if (eventItem.isAllDayEvent())
            {
                if (eventItem.getScheduleStartDate()>eventItem.StartDate){
                    moveEarlier = true;
                }
                if (eventItem.getScheduleStartDate()<eventItem.EndDate){
                    moveLater = true;
                }
            }
            
            if (moveEarlier){
                //Show the button
                $j(div).find('.event-move-earlier').addClass('move-earlier-true');    
            }else{
                //Hide the button
                $j(div).find('.event-move-earlier').removeClass('move-earlier-true');
            }
            
            if (moveLater){
                $j(div).find('.event-move-later').addClass('move-later-true');
            }else{
                $j(div).find('.event-move-later').removeClass('move-later-true');
            }
        });
    }
    
    var refreshScheduleDataSource = function(contentIdToHighlight)
    {
        uob.log.addLogMessage("Refresh Schedule Data Source");
        
        var scheduleData = app.uobRepository.eventsRepository.getSelectedEventItems(scheduleEventGroup, true, getFilterFunctionForOpenDayDate());
        
        if ($j("#" + scheduleEventsListViewId).data("kendoMobileListView"))
        {
            uob.log.addLogMessage("Updating schedule list view data source");
            var listviewDataSource = $j("#" + scheduleEventsListViewId).data("kendoMobileListView").dataSource;
            listviewDataSource.data(scheduleData);
            if (contentIdToHighlight){
                var item = $j('#' + scheduleEventsListViewId + ' div[uob-content-id="' + contentIdToHighlight + '"]');
                
                item.hide().fadeIn(250);
                item.addClass('highlightEvent').delay(250).queue(function() {
                           $(this).removeClass("highlightEvent");
                           $(this).dequeue();
                       });
            }
        }
        else{
            console.log("Initialising schedules list view");
            var eventsListDataSource = new kendo.data.DataSource({
                data: scheduleData,
                sort: [
                    { field: "getScheduleStartDate()", dir: "asc" },
                    { field: "Title", dir: "asc" }
                  ],
                pageSize: 10000
            });
            $j("#" + scheduleEventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-schedule-template").text(),
                dataBound: function(){
                    uob.log.addLogMessage("Schedule Data Bound starting");
                    setupMoveEarlierAndLater(scheduleEventsListViewId, this.dataSource);
                    setupLocationClick(scheduleEventsListViewId);
                    reportNoData(scheduleEventsListViewId,  "You have no scheduled activities selected.");
                    uob.log.addLogMessage("Schedule Data Bound complete");
                } 
            });
            
            setupRemoveClick(scheduleEventsListViewId, scheduleEventGroup, refreshScheduleDataSource);
            
            $j("#" + scheduleEventsListViewId).on('click', " .move-earlier-true", scheduleMoveClick);
            $j("#" + scheduleEventsListViewId).on('click', " .move-later-true", scheduleMoveClick);
            
        }    
    }; 
    
    var scheduleMoveClick = function(event)
    {
    	uob.log.addLogMessage("Move clicked");
        var scheduleMover=$j(this);
        scheduleMover.hide();
        //Get UID:
        var currentLi = scheduleMover.parent().parent().parent();
        var uid = $j(currentLi).attr('data-uid');
        //Get datasource:
        
        var dataSource = currentLi.parent().data("kendoMobileListView").dataSource;   
        
        var eventItem = dataSource.getByUid(uid);
        
        var moveEvent;
        
        if (scheduleMover.hasClass('event-move-earlier'))
        {
            moveEvent = app.uobRepository.eventsRepository.moveEventEarlierInSchedule(scheduleEventGroup, eventItem);
        }
        else{
            moveEvent = app.uobRepository.eventsRepository.moveEventLaterInSchedule(scheduleEventGroup, eventItem);
        }

        if (!moveEvent)
        {
            navigator.notification.alert("Cannot move activity in schedule -- you may need to move some of your other events to fit it in.", null,"Schedule clash", 'OK');
            return false;
        }
        
        refreshScheduleDataSource(eventItem.ContentId);
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
                
        var openDayDate = getOpenDayDateValue();
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
                    setupSelectorsForEventGroup(eventsListViewId, scheduleEventGroup, true);
                    setupLocationClick(eventsListViewId);
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
    
    app.uobEvents.populateScheduleEventList = function (e){
        
    	uob.log.addLogMessage("Populate Schedule Data Source");
        refreshScheduleDataSource();
    };

})(window, jQuery);
