
//EVENTS

(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.events = uob.events || {};
    uob.date = uob.date || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.screen= uob.screen || {};    
    
    
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
        
        //Sort out the preformatting of the dates to save resource later:
        this.StartDayInUK = uob.date.formatDateAsUK(this.StartDate, 'YYYY-MM-DD');
        this.StartTimeInUK = uob.date.formatDateAsUK(this.StartDate, 'HH:mm');
    }
    
    uob.events.EventItem.prototype = {
        
        getEventType: function()
        {
            var eventItem = this;
            if (eventItem 
                && (Math.abs(eventItem.EndDate-eventItem.StartDate) / 36e5 > 6))
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
                //All day events effectively end at their schedule time -- they basically float free.
                return eventItem.getScheduleStartDate();
            }
            //Events with attendance duration need that taking into account.
            var scheduleEndDate = new Date(eventItem.getScheduleStartDate().getTime() + (eventItem.AttendanceDuration *60000));
            return scheduleEndDate;
        },
        //Does this event's schedule clash with another event's schedule?
        isClashingScheduledEvent: function(eventItem2){
            var eventItem1 = this;
            
            // Two all-day events without attendance duration can co-exist even at the same time
            if (eventItem1.getEventType()===uob.events.EventType.ALLDAY && eventItem2.getEventType() === uob.events.EventType.ALLDAY){
                return false;
            }
            
            var eventItem1ScheduleStartDate = eventItem1.getScheduleStartDate();
            var eventItem1ScheduleEndDate = eventItem1.getScheduleEndDate();
            
            var eventItem2ScheduleStartDate = eventItem2.getScheduleStartDate();
            var eventItem2ScheduleEndDate = eventItem2.getScheduleEndDate();
            
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
        }
    };
    
    uob.events.eventsRepository = {
        
        _eventItems: null,
        scheduleChunksInMinutes: 15,
        
        initialise: function (eventsDescription, eventsWebServiceUrl, localFile)
        {
            var that = this;
            app.application.showLoading();    
            
            if (!that._eventItems){
                uob.log.addLogMessage("Initialising Event retrieval");
                uob.json.getJSON(eventsDescription, eventsWebServiceUrl, localFile, that._eventsSuccess.bind(that), that._eventsCacheSuccess.bind(that), that._eventsError.bind(that));
            }
        },
        _eventsSuccess: function(data)
        {
            var that = this;
            that._setEventItems(data);
        },
        _eventsCacheSuccess:function(data)
        {
            var that = this;
            uob.log.addCacheMessage("Events data: Currently using local cache");
            that._setEventItems(data)
        },
        _eventsError: function()
        {
            uob.log.addErrorMessage("Error retrieving local events. No items found");   
            app.application.hideLoading();    
        },
        
        _setEventItems: function(eventItems){
            var that = this;
            console.log("Retrieved " + eventItems.length + " event items");
            
            that._eventItems = that._parseEventItems(eventItems);
            uob.screen.enableLinks("eventsRepositoryButton");
            app.application.hideLoading();  
        },
        _parseEventItems: function(eventItems)
        {

            var parsedEventItems = [];
            
            for(var i in eventItems)
            {
                var eventItem = eventItems[i];
                var parsedEventItem = new uob.events.EventItem(eventItem);
                parsedEventItems.push(parsedEventItem);
                    
            }
            return parsedEventItems;
        },
        
        
        _setupEventItemFunctions: function(eventItem)
        {
            eventItem.prototype = uob.events.eventItem;
        },
        
        moveEventLaterInSchedule: function(eventGroup, eventItem)
        {
            var that = this;
            return that._moveEventInSchedule(eventGroup, eventItem, that.scheduleChunksInMinutes);
        },
        
        moveEventEarlierInSchedule: function(eventGroup, eventItem)
        {
            var that = this;
            return that._moveEventInSchedule(eventGroup, eventItem, 0-that.scheduleChunksInMinutes);
        },
        
        _moveEventInSchedule: function(eventGroup, eventItem, minutesToChangeBy)
        
        {
            var that = this;
            var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
            
            var newDate = that._getScheduleStartDateForItem(eventItem, selectedEventItems, minutesToChangeBy);
            
            if (newDate)
            {
                console.log("Changing event schedule: " + eventItem.Title + " from " + eventItem.getScheduleStartDate() + " to " + newDate);
                eventItem.setScheduleStartDate(newDate);
                uob.events.eventsRepository.updateEventInSelectedData(eventGroup, eventItem, true);
                return true;
            }
            else{
                console.log("Cannot change event: " + eventItem.Title + " to schedule: " + newDate);
                return false;
            }        
            
        },
        
        _getScheduleStartDateForItem: function (eventItem, selectedEventItems, minutesToChangeBy, initialScheduleStartDate){
            
            console.log("Looking for schedule date for: " + eventItem.Title + " with current schedule date: " + eventItem.getScheduleStartDate() + " minutes to change by: " + minutesToChangeBy );
            //Basically, We take a copy of the event item to test against and see if we can find somewhere in the schedule for it
            var that = this;
            
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
                minutesToChangeBy = that.scheduleChunksInMinutes;
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
                                if (selectedEventItem.getScheduleStartDate()<selectedEventItem.getScheduleEndDate()){
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
            }while (lastDate && (lastDate)!==eventItemToTest.getScheduleStartDate());
                        
            if (eventItemToTest.getScheduleEndDate()>eventItem.EndDate)
            {
                console.log("Cannot find a new schedule date which is before the end date -- returning null");
                lastDate = null;
            }
            
            if (eventItemToTest.getScheduleStartDate()<eventItem.StartDate)
            {
                console.log("Cannot find a new schedule date which after the start date -- returning null");
                lastDate = null;
            }
            
            return lastDate;
            
        },
                
        removeEventFromSelectedData: function(eventGroup, eventItem)
        {
            var that = this;
            var selectedEventData= that._getSelectedEventData(eventGroup);
            
            var contentId = eventItem.ContentId;
            
            if (selectedEventData)
            {
                console.log('Removing Content id: ' + eventItem.ContentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
                
                var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
                
                console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
                
                that._setSelectedEventData(eventGroup, eventsWithoutContentId);
            }
            else{
                console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
            }
        },
    
        addEventToSelectedData: function(eventGroup, eventItem, scheduledEvent)
        {
            
            var that = this;

            var scheduleStartDate = null;
            
            if(scheduledEvent){
                
                if (eventItem.getEventType()===uob.events.EventType.FIXED){
                 
                    if (!that._checkAndResolveScheduleClashesForFixedEvent(eventGroup, eventItem))
                    {
                     
                        return false;
                        
                    }
                    
                }
                else{
                
                    var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
                    scheduleStartDate = that._getScheduleStartDateForItem(eventItem, selectedEventItems);
                    
                    if (!scheduleStartDate)
                    {
                        return false;
                    }
                }
            }

            var selectedEventData= that._getSelectedEventData(eventGroup);
            
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
            
            that._setSelectedEventData(eventGroup, selectedEventData);
            
            return true;
        },
        
        
        _checkAndResolveScheduleClashesForFixedEvent: function(eventGroup, eventItem)
        {
         
            var that = this;
            var selectedEventItems = that.getSelectedEventItems(eventGroup, true);
            
            //As fixed items cannot be moved we first check to see if there's already something in the schedule which clashes with it:
            var clashingEventItems = $j.grep(selectedEventItems, function(e){ return e.isClashingScheduledEvent(eventItem);});
            
            if (!clashingEventItems || clashingEventItems.length===0)
            {
                console.log ("No clashing event items for Event Item: " + eventItem.Title);
                return true;
            }
            
            
            var clashingAllDayEventItems = $j.grep(clashingEventItems, function(e){return e.isAllDayEvent();});
            
            if (!clashingAllDayEventItems || clashingAllDayEventItems.length!==clashingEventItems.length)
            {
                 console.log("Not all clashing event items are all day events so cannot resolve clash for event "+ eventItem.Title);
                return false;
            }
            
            console.log("All clashing dates with selected event item are all day -- testing to see if possible to move them out of the way");
            //All the clashing events are all day and so in theory are moveable -- if we get the non-clashing events and add the 
            //new event item we could see if we can get a schedule startdate for the clashing ones!
            var nonClashingEvents = $j.grep(selectedEventItems, function(e){return !e.isClashingScheduledEvent(eventItem);});
            
            nonClashingEvents.push(eventItem);
            
            var viableToShuffle = true;
            
            var newScheduleStartDates = [];

            //Create a new set of scheduled events which 
            for(var clashingIndex in clashingEventItems)
            {
                var clashingEventItem = clashingEventItems[clashingIndex];
                
                var newScheduleStartDate = that._getScheduleStartDateForItem(clashingEventItem, nonClashingEvents, null, clashingEventItem.StartDate);
                
                if (!newScheduleStartDate)
                {
                    viableToShuffle = false;
                    break;
                }
                
                //Add this item to the nonClashingEvents -- take a clone as we don't want to mess up real data:
                var eventItemCopy = new uob.events.EventItem(clashingEventItem);
                
                eventItemCopy.setScheduleStartDate(newScheduleStartDate);
                
                nonClashingEvents.push(eventItemCopy);
                
                newScheduleStartDates.push(newScheduleStartDate);
                
            }
            if (!viableToShuffle)
            {
                console.log("Not viable to shuffle all day events to accomodate event: " + eventItem.Title + " " + eventItem.StartDate + " - " + eventItem.EndDate);
                return false;
            }

            //Now update the existing items with the new schedule dates.
            for(var clashingIndex2 in clashingEventItems)
            {
                var updateableClashingEventItem = clashingEventItems[clashingIndex2];
                
                updateableClashingEventItem.setScheduleStartDate(newScheduleStartDates[clashingIndex2]);
                
                that.updateEventInSelectedData(eventGroup, updateableClashingEventItem, true);
                
            }

            return true;
        },
        
        updateEventInSelectedData: function(eventGroup, eventItem, setScheduleStartDate)
        {
            var that = this;
            var existingSelectedEventData = that._getSelectedEventData(eventGroup);
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
            
            that._setSelectedEventData(eventGroup, newSelectedEventData);
        },
        
        isContentIdSelected: function(eventGroup, contentId)
        {
            var that = this;
            return (that._getSelectedEventDataForContentId(eventGroup, contentId));
        },
        
        _getSelectedEventDataForContentId: function(eventGroup, contentId)
        {
            var that = this;
            var selectedEventData = that._getSelectedEventData(eventGroup);
            
            var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
            if (eventsWithContentId && eventsWithContentId.length){
                
                return eventsWithContentId[0];
            }
            return null;
            
        },
        
        getEventItems: function (filteringFunction)
        {
            var that = this;
            if (that._eventItems){
                
                if (filteringFunction){
                     console.log("Retrieving items with filtering function");
                    return $j.grep(that._eventItems, filteringFunction);
                }
                else{
                 return that._eventItems;
                }
            }
            else{
                uob.log.addErrorMessage("Request for data source before initilisation is complete");
            }
            return null;
         },
        
        getSelectedEventItems: function (eventGroup, scheduledEvents, filteringFunction)
        {
            console.log("Get selected event items for " + eventGroup);
            var that = this;
            var allEventItems = that.getEventItems(filteringFunction);
            
            var selectedEventItems = [];
            
            if (!allEventItems){
                console.log("No event items to filter for selection");
                return selectedEventItems;
            }

            var selectedEventData= that._getSelectedEventData(eventGroup);
            if (!selectedEventData){
                console.log("No selected events so nothing to retrieve");
                return selectedEventItems;
            }
            
            
            for (index = 0; index < allEventItems.length; ++index) {
                var eventItem = allEventItems[index];
                var contentId = eventItem.ContentId;
                var selectedEventDataItem = that._getSelectedEventDataForContentId(eventGroup, contentId)
                if (selectedEventDataItem)
                {
                    //Supplement the event data with that from the event group:
                    if (scheduledEvents)
                    {
                        console.log("Set Schedule date if got one, otherwise set to Start Date");
                        eventItem.setScheduleStartDate(selectedEventDataItem.ScheduleStartDate);
                    }
                    selectedEventItems.push(eventItem);
                }
            }
           
            console.log("Returning " + selectedEventItems.length + " selected events for " + eventGroup);
            return selectedEventItems;
        },

         
        _setSelectedEventData: function(eventGroup, eventData)
        {
            var that = this;
            var stringEventData = JSON.stringify(eventData);
            localStorage.setItem(that.eventsLocalStoragePrefix + eventGroup, stringEventData);    
        },
        
        _getSelectedEventData: function(eventGroup)
        {
            var that = this;
            var stringEventData = localStorage.getItem(that.eventsLocalStoragePrefix + eventGroup);
            if (stringEventData){
                return JSON.parse(stringEventData);
            }
            return [];
            
        }
        
    };

})(window, jQuery);
