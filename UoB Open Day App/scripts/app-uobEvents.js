
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
      
    app.uobEvents.populateEventList = function (e){
        
        uob.log.addLogMessage("Starting event list population");
        app.application.showLoading();
        
        var eventsListViewId = "open-day-events-view";
        
        //Set up activity filter
        var activityFilter = $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        
        var filterFunction = null;
        
        if (!activityFilter){
        
            $j("#event-activity-type-filter").kendoMobileButtonGroup({
                select: app.uobEvents.populateEventList,
                index: 0
            });            
            
            activityFilter =  $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
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
        
        //Date filter:
        var filterFunctionForOpenDayDate = getFilterFunctionForOpenDayDate();
        
        filterFunction = function(eventItem){
            
            //Make sure the day matches
            if (!filterFunctionForOpenDayDate(eventItem))
            {
                return false;
            }
           
            if (activityType){
                return (eventItem.Keywords.indexOf(activityType) >=0);
            }
            //There's no filter
            return true;
        };
        var eventItems = app.uobRepository.eventsRepository.getEventItems(filterFunction);
        console.log("Retrieved " + eventItems.length + " eventItems");
        var eventsListDataSource = new kendo.data.DataSource({
                data: eventItems,
            	sort: { field: "Title", dir: "asc" },
                pageSize: 1000
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
                    autoFilter: false,
                    field: "Title",
                    operator: "contains"
                },
                dataBound: function(){
                    setUpIcons(eventsListViewId, favouriteEventGroup, this.dataSource);
                    setUpIcons(eventsListViewId, scheduleEventGroup, this.dataSource, true);
                    reportNoData(eventsListViewId, this.dataSource.data(), "No activities found.");
                    uob.log.addLogMessage("Data bind complete");
                    app.application.hideLoading();

                } 
            });
            
       }
    };
    
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

    app.uobEvents.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
         
        var eventsListDataSource = new kendo.data.DataSource({
                data:  app.uobRepository.eventsRepository.getSelectedEventItems(favouriteEventGroup, false, getFilterFunctionForOpenDayDate())
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
                    setUpIcons(eventsListViewId, scheduleEventGroup,this.dataSource, true);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no favourite activities selected.");
                } 
            });
        }
        
    };
    
    app.uobEvents.populateScheduleEventList = function (e){
        
    	uob.log.addLogMessage("Populate Schedule Data Source");
        refreshScheduleDataSource();
    };
    
        app.uobEvents.openScheduleListHelp = function(e){
        $j("#modalview-schedule-help").data("kendoMobileModalView").open();
    };
    
    app.uobEvents.closeScheduleListHelp = function (e){
    	$j("#modalview-schedule-help").data("kendoMobileModalView").close();    
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
                    uob.log.addLogMessage("Schedule Data Bound");
                    setupMoveUpAndDown(scheduleEventsListViewId, this.dataSource);
                    reportNoData(scheduleEventsListViewId, this.dataSource.data(), "You have no scheduled activities selected.");
                } 
            });
        }    
    };
    
    var getFilterFunctionForOpenDayDate = function()
    {
        var openDayDate = app.uobOpenDay.getOpenDayDateAsDate();
        var openDayDateInUk = uob.date.formatDateAsUK(openDayDate, 'YYYY-MM-DD');
        console.log("Filter for: " + openDayDateInUk);
        var filterFunction = function(eventItem){
            
            return eventItem.StartDateInUk=== openDayDateInUk;
        };
        
        return filterFunction;
    }
    
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
        
    var reportNoData = function(listViewId, thisDataSourceData, noDataMessage)
    {
        if(thisDataSourceData.length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
    var hideIcons = function (listViewId, eventGroup)
    {
        $j("#" + listViewId + " .event-" + eventGroup).hide();    
    }
    
    var setUpIcons = function(listViewId, eventGroup, dataSource, scheduledEvent){
        
        console.log("Setup icons for " + eventGroup);
        $j("#" + listViewId + " .event-" + eventGroup).each(function() {
            
            var selector = this;
			var eventData = {listViewId: listViewId,
            			scheduledEvent: scheduledEvent,
        				eventGroup: eventGroup};
            var uid = $j(selector).parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (eventItem){
                setupIconSpan(eventGroup, selector, app.uobRepository.eventsRepository.isContentIdSelected(eventGroup, eventItem.ContentId));
                
                $j(selector).click(eventData, selectorClick);
            }
            
        });
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
 

})(window, jQuery);
