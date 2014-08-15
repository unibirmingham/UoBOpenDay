
//EVENTS

(function (global, $j) {
    
    var app = global.app = global.app || {};
    app.uobOpenDay = app.uobOpenDay || {};
    app.uobRepository = app.uobRepository || {};
    app.uobEvents = app.uobEvents || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    
   
    var scheduleEventsListViewId = "open-day-schedule-events-view";
    var scheduleEventGroup = 'schedule';
    var favouriteEventGroup = 'favourite';
    
    app.uobEvents.lastEventListPopulation = "";
    
    app.uobEvents.populateEventList = function (e){
    
        setupEventList();
    }
        
    var setupEventList = function(resetScroller){
        
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
                console.log("No need to update filter as already in place updating favourites and schedule values");
                //The user could've changed the selected items in one of the other screens so reinitialise them:
                setupSelectorValues(eventsListViewId, favouriteEventGroup, false);
                setupSelectorValues(eventsListViewId, scheduleEventGroup, true);
                 
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
                    setupSelectors(eventsListViewId, favouriteEventGroup, false);
                    setupSelectors(eventsListViewId, scheduleEventGroup, true);
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
            
            //Set up favourite click events
            var favouriteClickData = {listViewId: eventsListViewId,
            			scheduledEvent: false,
        				eventGroup: favouriteEventGroup};
        
            $j("#" + eventsListViewId).on('click', " .event-" + favouriteEventGroup, favouriteClickData, selectorClick);
        
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
    
    app.uobEvents.clearEventSearch = function()
    {
        $j('#activity-search-text').val("");
        setupEventList(true);
    };
    
    app.uobEvents.searchEvents = function()
    {
        setupEventList(true);
    };
        
    var showLocationClick = function(event)
    {
        var button = $j(this);
    	console.log("Location click start.");
        var eventDetails = button.parent().parent();
        button = null;
        var listView = $j("#" + event.data.listViewId).data("kendoMobileListView");
		var dataSource = listView.dataSource;
        var uid = eventDetails.parent().attr('data-uid');
        var eventItem = dataSource.getByUid(uid);
        if (eventItem){
            var descriptionText;
            if (eventItem.BuildingIds.length)
            {
                descriptionText = '<a href="#tabstrip-map?buildingId=' + eventItem.BuildingIds[0] + '">' + eventItem.Location + '</a>';
            }
            else{
                descriptionText = eventItem.Location ;
            }
            descriptionText = descriptionText + ": " + eventItem.Description;
            
        	eventDetails.find("p").html(descriptionText);
		}
    	console.log("Location click end.");

    }
    
    app.uobEvents.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var openDayDateFilter = getFilterFunctionForOpenDayDate();
        
        var favouriteEvents = app.uobRepository.eventsRepository.getSelectedEventItems(favouriteEventGroup, false, openDayDateFilter);
        
        if ($j("#" + eventsListViewId).data("kendoMobileListView"))
        {
            console.log("Updating favourites list view data source");
            $j("#" + eventsListViewId).data("kendoMobileListView").dataSource.data(favouriteEvents);
        }
        else{
            
            var eventsListDataSource = new kendo.data.DataSource({
                data:  favouriteEvents,
                sort: [
                    { field: "StartDate", dir: "asc" },
                	{ field: "Title", dir: "asc" }
                  ]
            });
            
            console.log("Initialising favourites list view");
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-favourite-template").text(),
                dataBound: function(){
                    setupSelectors(eventsListViewId, scheduleEventGroup,true);
                    reportNoData(eventsListViewId,  "You have no favourite activities selected.");
                } 
            });
        
            //Set up schedule click events
            var scheduleClickData = {listViewId: eventsListViewId,
            			scheduledEvent: true,
        				eventGroup: scheduleEventGroup};
            $j("#" + eventsListViewId).on('click', " .event-" + scheduleEventGroup, scheduleClickData, selectorClick);
            
            setupRemoveFromSelection(eventsListViewId, favouriteEventGroup, app.uobEvents.populateFavouriteEventList);
        }
    };
   
    var setupSelectors = function(listViewId, eventGroup, scheduledEvent, filterFunction){
        
        console.log("Setup icons for " + eventGroup);
        setupSelectorValues(listViewId, eventGroup, scheduledEvent, filterFunction);
    }
    
    var setupSelectorValues = function(listViewId, eventGroup, scheduledEvent, filterFunction)
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
    }
    
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
        
        if ($j(selector).hasClass(eventGroup + "-true"))
        {
            setupSelectorState(eventGroup, selector, false);
            app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
        }
        else{
            if(app.uobRepository.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent))
            {
                setupSelectorState(eventGroup, selector, true);
            }
            else{
                navigator.notification.alert("Cannot add '" + eventItem.getTitleAndTime() + "' to the schedule -- please check your schedule for clashing events.", null,"Schedule clash", 'OK');
            }
        }
        return false;
    }
    
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
    }
 
    var setupRemoveFromSelection = function (listViewId, eventGroup, reloadFunction){
    
       var eventData = {listViewId: listViewId,
				eventGroup: eventGroup,
       			reloadFunction: reloadFunction};
        
        $j("#" + listViewId).on('click', " .remove-" + eventGroup,eventData, removeClick);
        
    }
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
    
    app.uobEvents.populateScheduleEventList = function (e){
        
    	uob.log.addLogMessage("Populate Schedule Data Source");
        refreshScheduleDataSource();
    };
    
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
                    reportNoData(scheduleEventsListViewId,  "You have no scheduled activities selected.");
                    uob.log.addLogMessage("Schedule Data Bound complete");
                } 
            });
            
            setupRemoveFromSelection(scheduleEventsListViewId, scheduleEventGroup, refreshScheduleDataSource);
            
            $j("#" + scheduleEventsListViewId).on('click', " .move-earlier-true", scheduleMoveClick);
            $j("#" + scheduleEventsListViewId).on('click', " .move-later-true", scheduleMoveClick);
            
        }    
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

    var getOpenDayDateValue = function()
    {
        var openDayDate = app.uobOpenDay.getOpenDayDateAsDate();
        var openDayDateInUk = uob.date.formatDateAsUK(openDayDate, 'YYYY-MM-DD');
        return openDayDateInUk;
    }
    var getFilterFunctionForOpenDayDate = function()
    {
        var openDayDateInUk = getOpenDayDateValue();
        console.log("Creating filter function for: " + openDayDateInUk);
        var filterFunction = function(eventItem){
            return eventItem.StartDateInUk=== openDayDateInUk;
        };
        
        return filterFunction;
    }
    
    
    var reportNoData = function(listViewId, noDataMessage)
    {
        var listView = $j("#" + listViewId).data("kendoMobileListView");
        if(listView && listView.items().length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
    

})(window, jQuery);
