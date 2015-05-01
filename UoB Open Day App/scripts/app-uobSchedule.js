
//EVENTS

(function (global, $j) {
    
    var app,
        uob,
        scheduleEventsListViewId = "open-day-schedule-events-view",
        scheduleEventGroup = 'schedule',
        scheduleTemplate;
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
        var listView = $j("#" + listViewId);
        if(listView && listView.html().trim().length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    

    
    var removeClick = function(event)
    {
        var eventGroup = event.data.eventGroup;
        var reloadFunction = event.data.reloadFunction;
        var contentId = app.uobEvents.getContentIdForCurrentElement(this);
        var eventItem;
                
        if (contentId){
        
            eventItem = app.uobRepository.eventsRepository.getEventItemForContentId(contentId);
            
            navigator.notification.confirm("Are you sure you wish to remove the activity '" + eventItem.getTitleAndTime() + "'?", 
            	function(buttonIndex){
                    if (buttonIndex===1){
    					app.uobRepository.eventsRepository.removeContentIdFromSelectedData(eventGroup, contentId);
                        reloadFunction();
                    }
                },
            'Remove activity?',['Remove', 'Cancel']);
        }
    	
    };
    
    var setupRemoveClick = function (listViewId, eventGroup, reloadFunction){
    
       var eventData = {eventGroup: eventGroup,
       			reloadFunction: reloadFunction};
        
        $j("#" + listViewId).on('click', " .remove-" + eventGroup, eventData, removeClick);
        
    };
       
    var refreshScheduleDataSource = function(contentIdToHighlight)
    {
        var listView;
        
        uob.log.addLogMessage("Refresh Schedule Data Source");
        
        var scheduleData = app.uobRepository.eventsRepository.getSelectedEventItems(scheduleEventGroup, true, app.uobOpenDay.getFilterFunctionForOpenDayDate());
        
        listView = $j("#" + scheduleEventsListViewId);
        
        if (!listView.html()){
            //Setup the click events:
            app.uobEvents.setupLocationClick(scheduleEventsListViewId);
            setupRemoveClick(scheduleEventsListViewId, scheduleEventGroup, refreshScheduleDataSource);
            
            $j("#" + scheduleEventsListViewId).on('click', " .move-earlier-true", scheduleMoveClick);
            $j("#" + scheduleEventsListViewId).on('click', " .move-later-true", scheduleMoveClick);            
            
        }
        
        updateList(scheduleEventsListViewId, scheduleData);

        if (contentIdToHighlight){
            var item = $j('#' + scheduleEventsListViewId + ' li[uob-content-id="' + contentIdToHighlight + '"]');
            
            item.hide().fadeIn(250);
            item.addClass('highlightEvent').delay(250).queue(function() {
                       $(this).removeClass("highlightEvent");
                       $(this).dequeue();
                   });
        }
        
        reportNoData(scheduleEventsListViewId,  "You have no scheduled activities selected.");
        uob.log.addLogMessage("Schedule Data Bound complete");
  
    }; 
    
    var updateList = function(eventListViewId, scheduledEventItems){
      
        var context,
            eventCounter,
            timeGroups,
            currentHeading,
            currentScheduledTimeDescription,
            currentScheduleEndDate,
            timeGroup,
            templateScript,
            eventItem,
            htmlForList;
        
        uob.log.addLogMessage("Update List starting");
        
        timeGroups = [];
        
        for(eventCounter=0;eventCounter<=scheduledEventItems.length-1;eventCounter+=1){
            
            eventItem = scheduledEventItems[eventCounter];
            if(!currentHeading || currentScheduledTimeDescription !== eventItem.getScheduledTimeDescription())
            {
                if(currentScheduleEndDate>eventItem.getScheduleStartDate()){
                    currentHeading = eventItem.getScheduledTimeDescription(currentScheduleEndDate);                    
                }
                else{
                    currentHeading = eventItem.getScheduledTimeDescription();
                }
                
                currentScheduledTimeDescription = eventItem.getScheduledTimeDescription();
                currentScheduleEndDate = eventItem.getScheduleEndDate();
                timeGroup = {
                                         heading: currentHeading,
                                         hour: currentHeading.substring(0, 2),
                                         eventItems: []
                                        };
                timeGroups.push(timeGroup);
            }
            timeGroup.eventItems.push(eventItem);
        }
        
        context = {
            timeGroups: timeGroups
        }
        
        if (!scheduleTemplate){
            templateScript = $j("#events-schedule-template").html();
            
            Handlebars.registerHelper('if_event_can_be_scheduled_earlier_or_later', function(eventItem, opts) {
                if (eventItem.canBeScheduledEarlier() || eventItem.canBeScheduledLater()){
                    return opts.fn(this);
                }else{
                    return opts.inverse(this);
                }
            });
            
            Handlebars.registerHelper('if_event_can_be_scheduled_earlier', function(eventItem, opts) {
                if (eventItem.canBeScheduledEarlier()){
                    return opts.fn(this);
                }else{
                    return opts.inverse(this);
                }
            });
            
            Handlebars.registerHelper('if_event_can_be_scheduled_later', function(eventItem, opts) {
                if (eventItem.canBeScheduledLater()){
                    return opts.fn(this);
                }else{
                    return opts.inverse(this);
                }
            });          
            
            uob.log.addLogMessage("Template script compiling");
            scheduleTemplate = Handlebars.compile(templateScript);
        }
        
        uob.log.addLogMessage("Handlebarring");
        
        htmlForList = scheduleTemplate(context);
        
        uob.log.addLogMessage("Setting html");

        $j('#' + eventListViewId).html(htmlForList);
        
        uob.log.addLogMessage("Update List complete");
    };
    
    var scheduleMoveClick = function(event)
    {
    	uob.log.addLogMessage("Move clicked");
        var scheduleMover=$j(this);
        scheduleMover.hide();
        
        //Get Content id:
        var contentId = app.uobEvents.getContentIdForCurrentElement(this);
        
        var moveEvent;
        
        if (scheduleMover.hasClass('event-move-earlier'))
        {
            moveEvent = app.uobRepository.eventsRepository.moveEventEarlierInSchedule(scheduleEventGroup, contentId);
        }
        else{
            moveEvent = app.uobRepository.eventsRepository.moveEventLaterInSchedule(scheduleEventGroup, contentId);
        }

        if (!moveEvent)
        {
            navigator.notification.alert("Cannot move activity in schedule -- you may need to move some of your other events to fit it in.", null,"Schedule clash", 'OK');
            return false;
        }
        
        refreshScheduleDataSource(contentId);
        return false;
    };
    
    app.uobSchedule.populateScheduleEventList = function (e){
        
    	uob.log.addLogMessage("Populate Schedule Data Source");
        refreshScheduleDataSource();
    };

})(window, jQuery);
