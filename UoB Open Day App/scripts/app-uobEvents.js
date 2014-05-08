
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
    
    //Help functions
    app.uobEvents.openHelp = function(e){
        if (app.application.view().id==="#tabstrip-events")
        {
        	app.uobEvents.openEventsListHelp();    
        }
        if (app.application.view().id==="#tabstrip-schedule")
        {
        	app.uobEvents.openScheduleListHelp();    
        }
    }
    
    app.uobEvents.openEventsListHelp = function(e){
        $j("#modalview-activities-help").data("kendoMobileModalView").open();
    };
    
    app.uobEvents.closeEventsListHelp = function (e){
    	$j("#modalview-activities-help").data("kendoMobileModalView").close();    
    };
    
    app.uobEvents.openScheduleListHelp = function(e){
        $j("#modalview-schedule-help").data("kendoMobileModalView").open();
    };
    
    app.uobEvents.closeScheduleListHelp = function (e){
    	$j("#modalview-schedule-help").data("kendoMobileModalView").close();    
    };
    
    app.uobEvents.populateEventList = function (e){
    
        setupEventList();
    }
        
    var setupEventList = function(resetScroller){
        
        uob.log.addLogMessage("Starting event list population");
        app.application.showLoading();
        
        var eventsListViewId = "open-day-events-view";
        
        //Set up activity filter
        var activityFilter = $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        
        if (!activityFilter){
        
            $j("#event-activity-type-filter").kendoMobileButtonGroup({
                select: app.uobEvents.populateEventList,
                index: 0
            });            
            
            activityFilter =  $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        }        
                
        var openDayDate = getOpenDayDateValue();
        
        var filterForDatasource = [{field: "StartDateInUk", operator: "eq", value:openDayDate}];
        
        var searchText = $j('#activity-search-text').val();
        if (searchText){
            filterForDatasource.push({field: "Title", operator: "contains", value: searchText});
        }
        
        //Make sure the activity type filters:
        var activityType = ""
        
        switch(activityFilter.current().text()){
            case "Subject":
            	activityType = "Open-Day-Subject";
            	break;
            case "General":
            	activityType = "Open-Day-General";
            	break;
        }
        console.log("Filtering by Activity: " + activityType );
        
        if (activityType){
            filterForDatasource.push({field: "Keywords", operator: "contains", value:activityType});
        }
        
        var eventsListView = $j("#" + eventsListViewId).data("kendoMobileListView");
        
        if (eventsListView)
        {
            console.log("Updating data source filter");
        	eventsListView.dataSource.filter(filterForDatasource);
    		if (resetScroller)
            {
                app.application.scroller().reset();
            }
        }
        else{
            
        	uob.log.addLogMessage("Getting event items");
        
            var eventItems = app.uobRepository.eventsRepository.getEventItems();
            uob.log.addLogMessage("Retrieved " + eventItems.length + " eventItems");
            
            var eventsListDataSource = new kendo.data.DataSource({
                data: eventItems,
            	sort: { field: "Title", dir: "asc" },
                pageSize: 1000,
                filter: filterForDatasource
            });
                    
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-template").text(),
                dataBound: function(){
                    uob.log.addLogMessage("Data bind start");
                    setUpIcons(eventsListViewId, favouriteEventGroup, false);
                    setUpIcons(eventsListViewId, scheduleEventGroup, true);
                    reportNoData(eventsListViewId, "No activities found.");
                    uob.log.addLogMessage("Data bind complete");
                    app.application.hideLoading();

                } 
            });
            
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
    }
    
    app.uobEvents.searchEvents = function()
    {
        setupEventList(true);
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
                data:  favouriteEvents
            });
            
            console.log("Initialising favourites list view");
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-favourite-template").text(),
                dataBound: function(){
                    setUpIcons(eventsListViewId, scheduleEventGroup,true);
                    reportNoData(eventsListViewId,  "You have no favourite activities selected.");
                } 
            });
        }
        
    };
    
    var hideIcons = function (listViewId, eventGroup)
    {
        $j("#" + listViewId + " .event-" + eventGroup).hide();    
    }
    
    var setUpIcons = function(listViewId, eventGroup, scheduledEvent, filterFunction){
        
        var index;
        
        console.log("Setup icons for " + eventGroup);
        var eventData = {listViewId: listViewId,
            			scheduledEvent: scheduledEvent,
        				eventGroup: eventGroup};
        
        //Set up the click events
        $j("#" + listViewId + " .event-" + eventGroup).click(eventData, selectorClick);
        
        //Make selected items true:
        var selectedEventItems = app.uobRepository.eventsRepository.getSelectedEventItems(eventGroup, scheduledEvent, filterFunction);
        
        for (index = 0; index < selectedEventItems.length; ++index) {
        
            var selectedEventItem = selectedEventItems[index];
            var selectorClass ="event-content-id-" + selectedEventItem.ContentId;
        	var selector = $j( "#" + listViewId + " div.event-selectors." + selectorClass + " .event-" + eventGroup);
            setupIconSpan(eventGroup, selector, true);
        }
        
    }
    
    var selectorClick = function(event)
    {
        var selector=this;

        console.log("Click start");
        var uid = $j(selector).parent().parent().attr('data-uid');
        
        var listViewId = event.data.listViewId;
        var listView = $j("#" + listViewId).data("kendoMobileListView");
        var dataSource = listView.dataSource;
        
        var scheduledEvent = event.data.scheduledEvent;
        var eventGroup = event.data.eventGroup;
        
        var eventItem = dataSource.getByUid(uid);
        
        if ($j(selector).hasClass(eventGroup + "-true"))
        {
            setupIconSpan(eventGroup, selector, false);
            app.uobRepository.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
        }
        else{
            if(app.uobRepository.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent))
            {
                setupIconSpan(eventGroup, selector, true);
            }
            else{
                navigator.notification.alert("Cannot add '" + eventItem.Title + "' (" + kendo.toString(eventItem.StartDate, 'HH:mm') + " - " + kendo.toString(eventItem.EndDate, 'HH:mm') + ") to the schedule -- please check your schedule for clashing events.", null,"Schedule clash", 'OK');
            }
        }
        return false;
    }
    
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
                    setupMoveUpAndDown(scheduleEventsListViewId, this.dataSource);
                    reportNoData(scheduleEventsListViewId,  "You have no scheduled activities selected.");
                    uob.log.addLogMessage("Schedule Data Bound complete");
                } 
            });
        }    
    };
    

    
    var setupMoveUpAndDown = function(listViewId, dataSource){
        
        uob.log.addLogMessage("Setup move up and down icons");
                
        $j("#" + listViewId + " div.schedule-movers").each(function() {
            
            var div = this;

            var uid = $j(div).parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            var moveUp = false;
            var moveDown = false;
            
            if (eventItem.isAllDayEvent())
            {
                if (eventItem.getScheduleStartDate()>eventItem.StartDate){
                    moveUp = true;
                }
                if (eventItem.getScheduleEndDate()<eventItem.EndDate){
                    moveDown = true;
                }
            }
            
            if (moveUp)
            {
                $j(div).find('.event-move-up').removeClass('moveup-false').addClass('moveup-true').on('click', scheduleMoveClick);
            }
            else{
                //Hide and remove click bindings
                $j(div).find('.event-move-up').removeClass('moveup-true').addClass('moveup-false').off('click');
            }
            
            if (moveDown){
                 $j(div).find('.event-move-down').removeClass('movedown-false').addClass('movedown-true').on('click', scheduleMoveClick);
            }
            else{
                $j(div).find('.event-move-down').removeClass('movedown-true').addClass('movedown-false').off('click');      
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
        
        if (scheduleMover.hasClass('event-move-up'))
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
