
//EVENTS

(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};    
    
    var eventsLocalStoragePrefix = "uob-events-repository";
    
    uob.events.EventType = {
          ALLDAY: "AllDay",
          ALLDAYWITHDURATION: "AllDayWithDuration",
          FIXED: "Fixed"
        };
    
    uob.events.EventItem = function(eventItem){
        //Copy the existing values:
        $j.extend(this, eventItem);
        //Make the dates into a Date object
        this.StartDate = uob.json.parseJsonDate(this.StartDate);
        this.EndDate = uob.json.parseJsonDate(this.EndDate);
        
    }
    
    uob.events.EventItem.prototype = {
        
        getEventType: function()
        {
            var eventItem = this;
            if (eventItem 
                && (Math.abs(eventItem.EndDate-eventItem.StartDate) / 36e5 > 3))
            {
                if (eventItem.AttendanceDuration ===0)
                {
                    return uob.events.EventType.ALLDAY;
                }
                else 
                {
                    return uob.events.EventType.ALLDAYWITHDURATION;   
                }
             }
            return uob.events.EventType.FIXED;
        },
    	isAllDayEvent: function()
        {
            var eventItem = this;
            var eventType = eventItem.getEventType();
            if (eventType===uob.events.EventType.ALLDAY ||eventType===uob.events.EventType.ALLDAYWITHDURATION)
            {
                return true;
            }
            return false;
        },
        getScheduleStartDate: function()
        {
            var eventItem = this;
            if (!eventItem._scheduleStartDate){
                eventItem.setScheduleStartDate();   
            }
            return eventItem._scheduleStartDate;
        },
        setScheduleStartDate:  function(scheduleStartDate)
        {
            var eventItem = this;
            eventItem._scheduleStartDate = new Date((scheduleStartDate? uob.json.parseJsonDate(scheduleStartDate): eventItem.StartDate));
        },
        //When does this end in the schedule
        getScheduleEndDate: function()
        {
            var eventItem = this;
            
            if (eventItem.getEventType()===uob.events.EventType.FIXED)
            {
                //Fixed events end when their end date is
                return eventItem.EndDate;
            }
            if (eventItem.getEventType()===uob.events.EventType.ALLDAY)
            {
                //All day events have a default duration:
                return new Date(eventItem.getScheduleStartDate().getTime() + (eventItem.getDurationOfAllDayEvent() *60000));
            }
            //Events with attendance duration need that taking into account.
            var scheduleEndDate = new Date(eventItem.getScheduleStartDate().getTime() + (eventItem.AttendanceDuration *60000));
            return scheduleEndDate;
        },
        getTitleAndTime: function()
        {
            var titleAndTime = this.Title + " (" + this.StartTimeInUk + "-" + this.EndTimeInUk + ")";
            return titleAndTime;
        },
        getScheduledTimeDescription: function()
        {
            var returnValue = uob.date.formatDateAsUK(this.getScheduleStartDate(), 'HH:mm') + "-" + uob.date.formatDateAsUK(this.getScheduleEndDate(), 'HH:mm');
            return returnValue;
        },
        
        getTimeDescription: function()
        {
            var returnValue = this.StartTimeInUk + "-" + this.EndTimeInUk;
            return returnValue;    
        },
        //Does this event's schedule clash with another event's schedule?
        isClashingScheduledEvent: function(eventItem2){
            var eventItem1 = this;
                       
            var eventItem1ScheduleStartDate = eventItem1.getScheduleStartDate();
            var eventItem1ScheduleEndDate = eventItem1.getScheduleEndDate();
            
            var eventItem2ScheduleStartDate = eventItem2.getScheduleStartDate();
            var eventItem2ScheduleEndDate = eventItem2.getScheduleEndDate();
            
            if (eventItem1.getEventType()===uob.events.EventType.ALLDAY && eventItem2.getEventType() === uob.events.EventType.ALLDAY){
                //All day events in the same building cannot clash:
                if (eventItem1.BuildingIds[0]=== eventItem2.BuildingIds[0]){
                    return false;
                }
            }
            
            //If the events aren't in the same building allow time to travel between them:
            if (eventItem1.BuildingIds[0]!== eventItem2.BuildingIds[0]){
                eventItem1ScheduleEndDate = new Date(eventItem1ScheduleEndDate.getTime() + (eventItem1.getTimeToMoveBetweenBuildingsInMinutes() *60000));
                eventItem2ScheduleEndDate = new Date(eventItem2ScheduleEndDate.getTime() + (eventItem2.getTimeToMoveBetweenBuildingsInMinutes() *60000));
            }
            
            //Otherwise, check if the schedule dates cross -- note that an event can start at the end time of a previous event.
            if (eventItem1ScheduleStartDate>=eventItem2ScheduleStartDate && eventItem1ScheduleStartDate<eventItem2ScheduleEndDate)
            {
                console.log("Event: " + eventItem1.Title + " starts at " + eventItem1ScheduleStartDate + " which is during " + eventItem2.Title + " (" + eventItem2ScheduleStartDate + "-" + eventItem2ScheduleStartDate + ")");
                return true;
            }
            if (eventItem1ScheduleEndDate>eventItem2ScheduleStartDate && eventItem1ScheduleEndDate<=eventItem2ScheduleEndDate)
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
        },
        //If the event matches this one, but at a different time
        eventIsTheSameAtADifferentTime: function(comparisonEventItem){
                    
            //Same title, start date, description, type of event, same day,    
            return (this.Title             === comparisonEventItem.Title
                    && this.StartDateInUk  === comparisonEventItem.StartDateInUk
                    && this.Description    === comparisonEventItem.Description
                    && this.StartTimeInUk  !== comparisonEventItem.StartTimeInUk
                    && this.getEventType() === comparisonEventItem.getEventType()
                    && this.ContentId      !== comparisonEventItem.ContentId);
            
        },
        //The length of time that should be allowed to move from one building to another
        getTimeToMoveBetweenBuildingsInMinutes: function(){
            return 15;
        },
        getDurationOfAllDayEvent: function(){
            return 15;
        },
        canBeScheduledEarlier: function(){
            if (this.isAllDayEvent() && this.getScheduleStartDate()>this.StartDate){
                return true;
            }
            return false;
        },
        canBeScheduledLater: function(){
            
            var eventType = this.getEventType();
            
            if (eventType===uob.events.EventType.ALLDAY){
                //All day events can be moved if their end doesn't go past the end time.
                //Basically the given duration is the only time the event can be seen
                if (this.getScheduleEndDate()<this.EndDate){
                    return true;
                }
            }
            if (eventType===uob.events.EventType.ALLDAYWITHDURATION){
                //All day events can be moved if their start doesn't go past the end time.
                //Basically, the given duration is the only time the event can be started!
                if (this.getScheduleStartDate()<this.EndDate){
                    return true;
                }
            }
            return false;
        },
        isValidSchedule: function(){
            
            var eventType = this.getEventType();
            
            if (this.getScheduleStartDate()<this.StartDate){
                return false;
            }
            if (eventType===uob.events.EventType.ALLDAYWITHDURATION){
                //All day events can be moved if their start doesn't go past the end time.
                //Basically, the given duration is the only time the event can be started!
                if (this.getScheduleStartDate()>this.EndDate){
                    return false;
                }
            }
            else{
                if (this.getScheduleEndDate()>this.EndDate){
                    return false;
                }
            }
            return true;
        }
    };
    
    uob.events.EventsRepository = function(eventsDescription, eventsWebServiceUrl, localFile, initialisedFunction) {
        
        var eventItems = null;
        var scheduleChunksInMinutes = 15;
        
        var status =  uob.json.JsonStatus.UNINITIALISED;
        
        var initialisationDate;
        
        var getStatus = function(){
            return status;
        };
        
        var getInitialisationDate = function(){
            return initialisationDate;           
        }
        
        var hasData = function()
        {
			return uob.json.hasData(status);
        };
        
        var initialise = function (){
            if (!eventItems){
                uob.log.addLogMessage("Initialising Event retrieval");
                uob.json.getJSON(eventsDescription, eventsWebServiceUrl, localFile, eventsSuccess, eventsError);
            }
        };
        var eventsSuccess = function(data, jsonStatus){
            if (jsonStatus!== uob.json.JsonStatus.LIVE){
        		uob.log.addLogWarning('Events data: Currently using local cache');
        	}
            setEventItems(data);
            status = jsonStatus;
            initialisationDate = new Date();
            callInitialisedFunction();
        };
        var eventsError = function(jsonStatus){
            uob.log.addLogError("Error retrieving local events. No items found");   
            status = jsonStatus;
			callInitialisedFunction();  
        };

        var callInitialisedFunction = function(){
            if (initialisedFunction){
				initialisedFunction();
            }
        };

        var setEventItems = function(eventItemData){

            uob.log.addLogMessage("Retrieved " + eventItemData.length + " event items");
            eventItems = parseEventItems(eventItemData);
            uob.log.addLogMessage("Parsed " + eventItems.length + " event items");
        };
        
        var parseEventItems = function(eventItemData){

            var parsedEventItems = [];
            
            for(var i in eventItemData)
            {
                var eventItem = eventItemData[i];
                var parsedEventItem = new uob.events.EventItem(eventItem);
                parsedEventItems.push(parsedEventItem);
            }
            return parsedEventItems;
        };
        
        var moveEventLaterInSchedule = function(eventGroup, contentId){
            return moveEventInSchedule(eventGroup, contentId, scheduleChunksInMinutes);
        };
        
        var moveEventEarlierInSchedule = function(eventGroup, contentId){
            return moveEventInSchedule(eventGroup, contentId, 0-scheduleChunksInMinutes);
        };
        
        var getEventItemForContentId = function (contentId){
            
            contentId = parseInt(contentId);
            
            var eventItems = getEventItems();
            
            var eventItemsWithContentId = $j.grep(eventItems, function(eventItem){ return (eventItem.ContentId === contentId);});
            
            if (eventItemsWithContentId.length){
                eventItem = eventItemsWithContentId[0];
            }
            else{
                uob.log.addLogError("Failed to find event with id: " + contentId + " to move.");
                return false;
            }
            
            return eventItem;
        };
        
        var moveEventInSchedule = function(eventGroup, contentId, minutesToChangeBy){
                       
            var eventItem = getEventItemForContentId(contentId);

            if (!eventItem){
                uob.log.addLogError("Cannot move event for content id: " + contentId + " as it doesn't exist");
                return false;
            }
            
            var selectedEventItems = getSelectedEventItems(eventGroup, true);
                        
            var newDate = getScheduleStartDateForItem(eventItem, selectedEventItems, minutesToChangeBy);
            
            if (newDate)
            {
                console.log("Changing event schedule: " + eventItem.Title + " from " + eventItem.getScheduleStartDate() + " to " + newDate);
                eventItem.setScheduleStartDate(newDate);
                updateEventInSelectedData(eventGroup, eventItem, true);
                return true;
            }
            else{
                console.log("Cannot change event: " + eventItem.Title + " to schedule: " + newDate);
                return false;
            }        
        };
        
        var getScheduleStartDateForItem = function (eventItem, selectedEventItems, minutesToChangeBy, initialScheduleStartDate){
            
            console.log("Looking for schedule date for: " + eventItem.Title + " with current schedule date: " + eventItem.getScheduleStartDate() + " minutes to change by: " + minutesToChangeBy );
            //Basically, We take a copy of the event item to test against and see if we can find somewhere in the schedule for it
            var eventItemToTest = new uob.events.EventItem(eventItem);
                        
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
                eventItemToTest.setScheduleStartDate(new Date(eventItemToTest.getScheduleStartDate().getTime() + (minutesToChangeBy *60000)));
            }
            else
            {
                minutesToChangeBy = scheduleChunksInMinutes;
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
                                    eventItemToTest.setScheduleStartDate(new Date(selectedEventItem.getScheduleStartDate().getTime() + (minutesToChangeBy *60000)));
                                }
                                else{
                                    eventItemToTest.setScheduleStartDate(new Date(eventItemToTest.getScheduleStartDate().getTime() + (minutesToChangeBy *60000)));   
                                }
                            }
                            else{
                                //We're going later so try a later date -- you can start at the scheduled end date as the next thing can start at the point the previous one ended
                                if (selectedEventItem.getScheduleEndDate()>eventItemToTest.getScheduleStartDate()){
                                    eventItemToTest.setScheduleStartDate (new Date(selectedEventItem.getScheduleEndDate()));
                                }
                                else{
                                    eventItemToTest.setScheduleStartDate (new Date(eventItemToTest.getScheduleStartDate().getTime() + (minutesToChangeBy *60000)));
                                }
                            }
                            
                            console.log("New date to test for clashes: " + eventItemToTest.getScheduleStartDate());
                        }
                    }
                }
            //We carry on if there is a last date and it has a value which is different to the schedule date (as that means there's a new date to test).
            }while (lastDate && eventItemToTest.isValidSchedule() && (lastDate)!==eventItemToTest.getScheduleStartDate());

            if (!eventItemToTest.isValidSchedule())
            {
                console.log("Cannot find a new schedule date which is valid");
                lastDate = null;
            }
            
            return lastDate;
            
        };
                
        var removeEventFromSelectedData =function(eventGroup, eventItem)
        {
            var contentId = eventItem.ContentId;
            
            removeContentIdFromSelectedData(eventGroup, contentId);
            
        };
    
        var removeContentIdFromSelectedData = function(eventGroup, contentId)
        {
            contentId = parseInt(contentId);
            
            var selectedEventData= getSelectedEventData(eventGroup);
            
            if (selectedEventData)
            {
                console.log('Removing Content id: ' + contentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
                
                var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
                
                console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
                
                setSelectedEventData(eventGroup, eventsWithoutContentId);
            }
            else{
                console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
            }
        }
        
        var updateEventInSelectedData = function(eventGroup, eventItem, setScheduleStartDate)
        {
            var existingSelectedEventData = getSelectedEventData(eventGroup);
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
            
            setSelectedEventData(eventGroup, newSelectedEventData);
        };
        
        //See if space can be made for the fixed event even if that means moving moveable items out of the way
        // if updateSelectedEventsToMakeSpace is true it actually updates the selected items to make space
        // Returns: The clashing items if there are any. Null if a space was found
        var getClashingEventsForNewFixedEvent = function(eventGroup, eventItem, updateSelectedEventsToMakeSpace)
        {

            var selectedEventItems = getSelectedEventItems(eventGroup, true);
            
            //As fixed items cannot be moved we first check to see if there's already something in the schedule which clashes with it:
            var clashingEventItems = $j.grep(selectedEventItems, function(e){ return e.isClashingScheduledEvent(eventItem);});
            
            if (!clashingEventItems || clashingEventItems.length===0)
            {
                console.log ("No clashing event items for Event Item: " + eventItem.Title);
                return null;
            }
                        
            var clashingFixedEventItems = $j.grep(clashingEventItems, function(e){return e.getEventType()===uob.events.EventType.FIXED});
            
            if (clashingFixedEventItems && clashingFixedEventItems.length>0)
            {
                console.log("There are some clashing fixed event items so cannot resolve clash for event "+ eventItem.Title);
                return clashingFixedEventItems;
            }
            
            console.log("All clashing dates with selected event item are all day -- testing to see if possible to move them out of the way");
            //All the clashing events are all day and so in theory are moveable -- if we get the non-clashing events and add the 
            //new event item we could see if we can get a schedule startdate for the clashing ones!
            var nonClashingEvents = $j.grep(selectedEventItems, function(e){return !e.isClashingScheduledEvent(eventItem);});
            //Now add the item we want to test against
            nonClashingEvents.push(eventItem);
            
            var unmoveableEvents = [];
            
            var newScheduleStartDates = [];

            // Now go through the clashing events and work out if they can be given new schedule dates and so be added to the non-clashing ones.
            for(var clashingIndex in clashingEventItems)
            {
                var clashingEventItem = clashingEventItems[clashingIndex];
                
                var newScheduleStartDate = getScheduleStartDateForItem(clashingEventItem, nonClashingEvents, null, clashingEventItem.StartDate);
                
                if (!newScheduleStartDate){
                    //Add this to the list of events which cannot be moved to accomodate the event.
                    unmoveableEvents.push(clashingEventItem);
                }
                else{
                    
                    //Add this item to the nonClashingEvents (but only if we've not got an unmoveable event as the new event won't fit in.
                    if (unmoveableEvents.length===0){
                        //Take a clone as we don't want to mess up real data:
                        var eventItemCopy = new uob.events.EventItem(clashingEventItem);
                        
                        eventItemCopy.setScheduleStartDate(newScheduleStartDate);
                        
                        nonClashingEvents.push(eventItemCopy);
                        
                        newScheduleStartDates.push(newScheduleStartDate);
                    }
                }
            }
            if (unmoveableEvents.length>0)
            {
                console.log("Not viable to shuffle all day events to accomodate event: " + eventItem.Title + " " + eventItem.StartDate + " - " + eventItem.EndDate);
                return unmoveableEvents;
            }

            if (!updateSelectedEventsToMakeSpace){
                return null;
            }
            
            //Now update the clashing items with the new schedule dates which prevent the clash.
            for(var clashingIndex2 in clashingEventItems)
            {
                var updateableClashingEventItem = clashingEventItems[clashingIndex2];
                
                updateableClashingEventItem.setScheduleStartDate(newScheduleStartDates[clashingIndex2]);
                
                updateEventInSelectedData(eventGroup, updateableClashingEventItem, true);
            }

            return null;
        };
        
        var addEventToSelectedData =  function(eventGroup, eventItem, scheduledEvent)
        {
            var scheduleStartDate = null;
            var returnValue = {
                                eventAdded: false,
                                clashingEvents: []
            };
            
            if(scheduledEvent){
                
                if (eventItem.getEventType()===uob.events.EventType.FIXED){
                 
                    var clashingEvents = getClashingEventsForNewFixedEvent(eventGroup, eventItem, true);
                    
                    if (clashingEvents){
                        returnValue.clashingEvents = clashingEvents;
                        return returnValue;
                    }
                }
                else{
                
                    var selectedEventItems = getSelectedEventItems(eventGroup, true);
                    scheduleStartDate = getScheduleStartDateForItem(eventItem, selectedEventItems);
                    
                    if (!scheduleStartDate)
                    {
                        //Effectively there's no space anywhere in the schedule
                        returnValue.clashingEvents = [];
                        return returnValue;
                    }
                }
            }

            var selectedEventData= getSelectedEventData(eventGroup);
            
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
            
            setSelectedEventData(eventGroup, selectedEventData);
            
            returnValue.eventAdded = true;
            
            return returnValue;
        };
        
        var isContentIdSelected = function(eventGroup, contentId)
        {

            return (getSelectedEventDataForContentId(eventGroup, contentId));
        };
        
        var getSelectedEventDataForContentId = function(eventGroup, contentId, selectedEventData)
        {
            if (!selectedEventData){
            	selectedEventData = getSelectedEventData(eventGroup);
            }
            var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
            if (eventsWithContentId && eventsWithContentId.length){
                
                return eventsWithContentId[0];
            }
            return null;
            
        };
        
        var findAlternativeVersionsOfTheEventThatWillFitInTheSchedule = function(eventGroup, eventItem, filteringFunction){
            
            var currentEventItems,
                matchingEvents,
                matchingEvent;
            
            //First of all find any events which match the event passed in:
            currentEventItems = getEventItems(filteringFunction);
            
            matchingEvents = $j.grep(currentEventItems, function(e){ return eventItem.eventIsTheSameAtADifferentTime(e);});
            
            //Now check if there's any space in the schedule for them
            if (!matchingEvents){
                return null;
            }
            
            var alternativeEvents = [];
            for (matchingEventCounter in matchingEvents){
                matchingEvent = matchingEvents[matchingEventCounter];
                var clashingEvents = getClashingEventsForNewFixedEvent(eventGroup, matchingEvent, false);
                if (!clashingEvents){
                    alternativeEvents.push(matchingEvent);
                }
            }
            
            //Return the alternative events:
            return alternativeEvents;
            
        }
        
        var getEventItems = function (filteringFunction)
        {
            if (eventItems){
                
                if (filteringFunction){
                     console.log("Retrieving items with filtering function");
                    return $j.grep(eventItems, filteringFunction);
                }
                else{
                 return eventItems;
                }
            }
            else{
                uob.log.addLogError("Request for data source before initilisation is complete");
            }
            return null;
         };
        
        var getSelectedEventItems = function (eventGroup, scheduledEvents, filteringFunction)
        {
            console.log("Get selected event items for " + eventGroup);
            var allEventItems = getEventItems(filteringFunction);
            
            var selectedEventItems = [];
            
            if (!allEventItems){
                console.log("No event items to filter for selection");
                return selectedEventItems;
            }

            var selectedEventData= getSelectedEventData(eventGroup);
            if (!selectedEventData){
                console.log("No selected events so nothing to retrieve");
                return selectedEventItems;
            }
                        
            for (index = 0; index < allEventItems.length; ++index) {
                var eventItem = allEventItems[index];
                var contentId = eventItem.ContentId;
                var selectedEventDataItem = getSelectedEventDataForContentId(eventGroup, contentId, selectedEventData)
                if (selectedEventDataItem)
                {
                    //Supplement the event data with that from the event group:
                    if (scheduledEvents)
                    {
                        eventItem.setScheduleStartDate(selectedEventDataItem.ScheduleStartDate);
                    }
                    selectedEventItems.push(eventItem);
                }
            }
           
            //Before sending, if they're scheduled events, be kind and sort them into time order.
            if (scheduledEvents && selectedEventItems.length>0){
                
                selectedEventItems.sort(function(eventItem1, eventItem2){
                    if (eventItem1.getScheduleStartDate()<eventItem2.getScheduleStartDate()){
                        return -1;
                    } 
                    if (eventItem1.getScheduleStartDate()>eventItem2.getScheduleStartDate()){
                        return 1;
                    }
                    if (eventItem1.Title.toLowerCase() < eventItem2.Title.toLowerCase()){
                        return -1;
                    }
                    if (eventItem1.Title.toLowerCase() > eventItem2.Title.toLowerCase()){
                        return 1;
                    }
                    return 0;
                });
            }
            
            console.log("Returning " + selectedEventItems.length + " selected events for " + eventGroup);
            return selectedEventItems;
        };

         
        var setSelectedEventData = function(eventGroup, eventData)
        {
            var stringEventData = JSON.stringify(eventData);
            localStorage.setItem(eventsLocalStoragePrefix + eventGroup, stringEventData);    
        };
        
        var getSelectedEventData = function(eventGroup)
        {
            var stringEventData = localStorage.getItem(eventsLocalStoragePrefix + eventGroup);
            if (stringEventData){
                return JSON.parse(stringEventData);
            }
            return [];
        }
        
        return {
            hasData: hasData,
            getStatus: getStatus,
            getInitialisationDate: getInitialisationDate,
            getEventItems: getEventItems,
            getEventItemForContentId: getEventItemForContentId,
            getSelectedEventItems: getSelectedEventItems,
            moveEventLaterInSchedule: moveEventLaterInSchedule,
            moveEventEarlierInSchedule: moveEventEarlierInSchedule,
            removeEventFromSelectedData: removeEventFromSelectedData,
            removeContentIdFromSelectedData: removeContentIdFromSelectedData,
            addEventToSelectedData: addEventToSelectedData,
            isContentIdSelected: isContentIdSelected,
            initialise: initialise,
            findAlternativeVersionsOfTheEventThatWillFitInTheSchedule: findAlternativeVersionsOfTheEventThatWillFitInTheSchedule
        };
        
    };

})(window, jQuery);
