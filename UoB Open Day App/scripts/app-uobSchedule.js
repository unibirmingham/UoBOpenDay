
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
    app.uobSchedule = app.uobSchedule || {};
    
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
    
  
    var removeClick = function(event)
    {
        
        var uid = uob.kendo.getListViewUidForElement(this);
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

            var uid = uob.kendo.getListViewUidForElement(div);
            
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
        
        var scheduleData = app.uobRepository.eventsRepository.getSelectedEventItems(scheduleEventGroup, true, app.uobOpenDay.getFilterFunctionForOpenDayDate());
        
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
                group: "getScheduledTimeDescription()",
                pageSize: 10000
            });
            $j("#" + scheduleEventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-schedule-template").text(),
                headerTemplate: '<h2 class="hour${value.substring(0,2)}">${value}</h2>',
                dataBound: function(){
                    uob.log.addLogMessage("Schedule Data Bound starting");
                    setupMoveEarlierAndLater(scheduleEventsListViewId, this.dataSource);
                    app.uobEvents.setupLocationClick(scheduleEventsListViewId);
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
        var uid = uob.kendo.getListViewUidForElement(scheduleMover);
        //Get datasource:
        var dataSource = uob.kendo.getListViewDataSourceForElement(scheduleMover);
        
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
    
    app.uobSchedule.populateScheduleEventList = function (e){
        
    	uob.log.addLogMessage("Populate Schedule Data Source");
        refreshScheduleDataSource();
    };

})(window, jQuery);
