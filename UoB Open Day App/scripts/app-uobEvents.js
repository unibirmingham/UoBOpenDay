//EVENTS

(function (global, $j) {
    
    var app,
        uob,
        scheduleEventGroup = 'schedule',
        eventTemplate,
        listSettings=[];
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
            var selectorHolder = $j('#' + listViewId + ' li[uob-content-id="' + selectedEventItem.ContentId + '"]');
            var selector = selectorHolder.find(".event-" + eventGroup);
            setupSelectorState(eventGroup, selector, true);
        }
    };
    
    var locationClick = function(event){

        var contentId,
            eventItem,
            buildingId;
        
        if (!app.uobMap.openDayMap.isInitialised()){
            //Just leave the map alone.
            return;
        }
        
        console.log("Select click start");

        contentId = app.uobEvents.getContentIdForCurrentElement(this);
        eventItem = app.uobRepository.eventsRepository.getEventItemForContentId(contentId);

        if (eventItem && eventItem.BuildingIds && eventItem.BuildingIds.length>0){
            buildingId = eventItem.BuildingIds[0];
            app.application.navigate("#tabstrip-map?buildingId=" + buildingId);
        }
    
        return;
    }
    
    app.uobEvents.getContentIdForCurrentElement = function(element){
        
        var currentElement = $j(element),
            contentid;
        
        while(!contentid){
        
            contentid = currentElement.attr('uob-content-id');
            currentElement = currentElement.parent();
            
            if (!currentElement){
                break;
            }
        }
        
        return contentid;
        
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
            eventItem;
        
        console.log("Location click start.");
        contentId = app.uobEvents.getContentIdForCurrentElement(this);
        eventItem = app.uobRepository.eventsRepository.getEventItemForContentId(contentId);
        
        if (eventItem){
            
            if (eventItem.Location){
                descriptionText = '<span class="event-location clickableButton">' + eventItem.Location + '</span>: ';
            }
            else{
                descriptionText = '';
            }
            
            descriptionText = descriptionText + eventItem.Description;
            button = $j(this)
            eventDetails = button.parent().parent();
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
        var selector,
            contentId,
            eventItem,
            scheduledEvent,
            listViewId,
            eventGroup;
        
        console.log("Select click start");
        selector=this;

        listViewId = event.data.listViewId;
        scheduledEvent = event.data.scheduledEvent;
        eventGroup = event.data.eventGroup;
        
        contentId = app.uobEvents.getContentIdForCurrentElement(this);
        eventItem = app.uobRepository.eventsRepository.getEventItemForContentId(contentId);
        
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
    

    var getFilterFunction = function(openDayDate, activityTypeText, searchText){
      
        var keywords,
            filterFunction;
        
        switch(activityTypeText){
            case "Subject":
                keywords = "Open-Day-Subject";
                break;
            case "General":
                keywords = "Open-Day-General";
                break;
        }
        console.log("Filtering by Activity: " + keywords);
        
        if (keywords){
            keywords = keywords.toLowerCase();    
        }
        
        if (searchText){
            searchText = searchText.toLowerCase();    
        }
        
        filterFunction = function(eventItem){
        
            if (openDayDate && eventItem.StartDateInUk!== openDayDate){
                return false
            }
            
            if (keywords && eventItem.Keywords.toLowerCase().indexOf(keywords)===-1)
            {
                return false;
            }
            
            if (searchText &&
                (eventItem.Title.toLowerCase().indexOf(searchText)===-1
                 && eventItem.Description.toLowerCase().indexOf(searchText)===-1
                    && eventItem.Keywords.toLowerCase().indexOf(searchText)===-1)){
                return false;
            }
            
            return true;            
        };
        
        return filterFunction;
        
    };
    
    var displayEventList = function(resetScroller){
        
        var openDayDate,
            searchText,
            activityTypeFilter,
            activityTypeText,
            eventsListId,
            eventsList,
            eventsListSettings,
            filterFunction,
            context,
            templateScript;
        
        uob.log.addLogMessage("Starting event list population");
        
        //Set up activity filter if it doesn't already exist
        activityTypeFilter = $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        
        if (!activityTypeFilter){
        
            $j("#event-activity-type-filter").kendoMobileButtonGroup({
                select: app.uobEvents.populateEventList,
                index: 0
            });            
            
            activityTypeFilter =  $j("#event-activity-type-filter").data("kendoMobileButtonGroup");
        }
        
        activityTypeText = activityTypeFilter.current().text();
        
        eventsListId = "open-day-events-view-" + activityTypeText.toLowerCase();
       
        eventsList = $j("#" + eventsListId);
        
        eventsListSettings = listSettings[eventsListId];
        
        if (!eventsListSettings){
           //This list hasn't been seen so set up the events for it:
            
            //Event to show the location details
            var locationClickEventData = {
                                                listViewId: eventsListId
                };
            
            $j("#" + eventsListId).on('click', '.show-location', locationClickEventData, showLocationClick);
            
            //Location click event to go to the map
            app.uobEvents.setupLocationClick(eventsListId);
            
            //Add/Remove from schedule
            var scheduleClickData = {listViewId: eventsListId,
                                                scheduledEvent: true,
                                                                eventGroup: scheduleEventGroup};
        
            $j("#" + eventsListId).on('click', " .event-" + scheduleEventGroup, scheduleClickData, selectorClick);
        
            //Make the search activate if enter is pressed
            $("#activity-search-text" ).keypress(function( event ) {
                                                if ( event.which === 13 ) {
                     event.preventDefault();
                     app.uobEvents.searchEvents();
                                                }
                                                });
        }
        
        //Now let's get the filter settings:
        openDayDate = app.uobOpenDay.getOpenDayDateValue();
        console.log("Filter on date: " + openDayDate);
        
        searchText = $j('#activity-search-text').val();
        
        if (!eventsListSettings || 
            eventsListSettings.openDayDate!== openDayDate
              || eventsListSettings.activityTypeText!== activityTypeText
              || eventsListSettings.searchText!== searchText
              || eventsListSettings.listPopulationDate < app.uobRepository.eventsRepository.getInitialisationDate())
        {
            //So either the list is new or the settings have changed since the last population:
            $j('#activityStatus').text("Loading activities");    
            filterFunction = getFilterFunction(openDayDate, activityTypeText, searchText);        
            console.log("Getting events for " + openDayDate + " of type " + activityTypeText + " with search text '"+ searchText + "'");
            var eventItems = app.uobRepository.eventsRepository.getEventItems(filterFunction);            
        
            uob.log.addLogMessage("Sorting events.");
            eventItems.sort(function(eventItem1, eventItem2){
                    if (eventItem1.Title.toLowerCase()< eventItem2.Title.toLowerCase()){
                        return -1;
                    }
                    if (eventItem1.Title.toLowerCase()> eventItem2.Title.toLowerCase()){
                        return 1;
                    }
                    if (eventItem1.StartDate<eventItem2.StartDate){
                        return -1;
                    }
                    if (eventItem1.StartDate>eventItem2.StartDate){
                        return 1;
                    }
                    return 0;
            });
            
            context = {eventItems: eventItems};
        
            if (!eventTemplate){
                templateScript = $j("#events-template").html();
                uob.log.addLogMessage("Template script compiling");
                eventTemplate = Handlebars.compile(templateScript);
            }
            
            uob.log.addLogMessage("Handlebarring");
            
            htmlForList = eventTemplate(context);
            
            uob.log.addLogMessage("Setting html");

            eventsList.html(htmlForList);
            
            //Now stash the settings for the list for future comparison:
            listSettings[eventsListId] = {
                            openDayDate: openDayDate,
                            activityTypeText: activityTypeText,
                            searchText: searchText,
                            listPopulationDate: new Date()};
            
            reportNoData(eventsListId, "No activities found.");
            
        }
        
        $j('#eventLists ul:not(#' + eventsListId + ')').hide();
        
        eventsList.show();
        
        $j('#activityStatus').text(eventsList.find('.event-item').length + " activities retrieved");
        
        setupSelectorValuesForEventGroup(eventsListId, scheduleEventGroup, true);
        
        uob.log.addLogMessage("Events list " + eventsListId + " complete");
        
        if (resetScroller)
        {
            app.application.scroller().reset();
        }
        
    };    
    
    
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
