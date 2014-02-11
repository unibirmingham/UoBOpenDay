
//EVENTS

(function (global, $j) {
    
    app = global.app = global.app || {};
    
    var _retrievedEventsData;
    var _eventsDataSource;
    var eventsLocalStoragePrefix = "uob-events-";

    //Initialise events data:
    document.addEventListener("deviceready", onDeviceReady, true);
    
    function onDeviceReady() {

        initialiseEventsDataSource();
    }
    
    var initialiseEventsDataSource = function ()
    {
        app.application.showLoading();    
        var openDayEventsUrl = app.UoBEventsService + '?category=Open Day';
                
        if (!_eventsDataSource){
            _eventsDataSource = new kendo.data.DataSource({
                transport: {
                    read: {
                        url: openDayEventsUrl,
                        timeout: 15000,
                        dataType: "json"
                    }
                },
                pageSize: 10000,
                change: function (data) {
                    console.log('Change event');
                    if (data.items){
                        if (data.items.length>0){
                            console.log("Retrieved " + data.items.length + " items");
                            app.enableLinks("webServiceButton");
                            _retrievedEventsData = data.items;
                        }
                        else{
                             app.addErrorMessage("Error retrieving events. No items found");   
                        }
                    }                      
                    app.application.hideLoading();
                },
                error: function(e) {
                    var statusCode = e.status;
                    var errorThrown = e.errorThrown;
                    app.addErrorMessage("Error retrieving events: " + statusCode + " (" + errorThrown + ")");
                    app.application.hideLoading();
                }
            });
            console.log("Requesting events data");
            _eventsDataSource.fetch();
        }
    };
    
    var getEventItems = function ()
    {
        if (_retrievedEventsData){
             return _retrievedEventsData;
        }
        else{
            app.addErrorMessage("Request for data source before initilisation is complete");
        }
        return null;
     };
    
    app.populateEventList = function (e){
        
        var eventsListViewId = "open-day-events-view";
        var eventsListDataSource = new kendo.data.DataSource({
                data: getEventItems(),
                pageSize: 10000
            });
        
        $j("#" + eventsListViewId).kendoMobileListView({
            dataSource: eventsListDataSource,
            template: $j("#events-template").text(),
             filterable: {
                    field: "Title",
                    operator: "contains"
                },
            dataBound: function(){
                setUpIcons(eventsListViewId, 'favourite', eventsListDataSource);
                setUpClickEventOnSelectedIcons(eventsListViewId, 'favourite', eventsListDataSource);
                  setUpIcons(eventsListViewId, 'schedule', eventsListDataSource);
                setUpClickEventOnSelectedIcons(eventsListViewId, 'schedule', eventsListDataSource, validateSelectionOfScheduledEvent);
                  
            } 
            
        });
        
    };

    app.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var eventsListDataSource = new kendo.data.DataSource({
                data:  getSelectedEvents('favourite'),
                pageSize: 10000
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
                    hideIcons(eventsListViewId, 'favourite');
                    setUpIcons(eventsListViewId, 'schedule',eventsListDataSource);
                    setUpClickEventOnSelectedIcons(eventsListViewId, 'schedule', eventsListDataSource, validateSelectionOfScheduledEvent);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no favourite activities selected.");
                } 
                
            });
        }
        
    };
    
    app.populateScheduleEventList = function (e){
        
        var eventsListViewId = "open-day-schedule-events-view";
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: getSelectedEvents('schedule'),
                pageSize: 10000
            });
        
        if ($j("#" + eventsListViewId).data("kendoMobileListView"))
        {
            console.log("Updating schedule list view data source");
            $j("#" + eventsListViewId).data("kendoMobileListView").setDataSource(eventsListDataSource);
        }
        else{
            
            console.log("Initialising schedules list view");
            $j("#" + eventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-schedule-template").text(),
                dataBound: function(){
                    hideIcons(eventsListViewId, 'favourite');
                    hideIcons(eventsListViewId, 'schedule');
                    setupMoveUpAndDown(eventsListViewId, eventsListDataSource);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no scheduled activities selected.");
                } 
                
            });
        }    
    };
    
    var setupMoveUpAndDown = function(listViewId, dataSource){
        
        console.log("Setup move up and down icons");
        $j("#" + listViewId + " div.schedule-movers").each(function() {
            
            var div = this;

            var uid = $j(div).parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (isAllDayEvent(eventItem))
            {
                $j(div).find('span.event-move-up').removeClass('moveup-false').addClass('moveup-true');
                $j(div).find('span.event-move-down').removeClass('movedown-false').addClass('movedown-true');
            }
            else{
                $j(div).find('span.event-move-up').removeClass('moveup-true').addClass('moveup-false');
                $j(div).find('span.event-move-down').removeClass('movedown-true').addClass('movedown-false');
            }
            
        });
    }
    
    var reportNoData = function(listViewId, thisDataSourceData, noDataMessage)
    {
        if(thisDataSourceData.length === 0){
            //custom logic
            $("#" + listViewId).append("<p class='error-message'>" + noDataMessage+ "</p>");
        }    
    };
    
    var validateSelectionOfScheduledEvent = function(eventGroup, eventItem)
    {
        
        var existingScheduleItems = getSelectedEvents(eventGroup);
        
        if (isAllDayEvent(eventItem)){
                console.log("User has scheduled an all day event so no need to look for clashes");
                return true;
            }
        else{
            var clashingEvents = $j.grep(existingScheduleItems, function(e){ 
                
                
                if (isAllDayEvent(e)){
                    console.log("This is an all day event so cannot clash.");
                    return false;
                }
                
                return (eventItem.StartDate>=e.StartDate && eventItem.StartDate<=e.EndDate)
                        ||
                        (eventItem.EndDate>=e.StartDate && eventItem.EndDate<=e.EndDate)
                        ||
                        (eventItem.StartDate<=e.StartDate && eventItem.EndDate>=e.EndDate);
            });
            
            if (clashingEvents && clashingEvents.length >0)
            {
                navigator.notification.alert("Event clashes with another event in the schedule", null,"Schedule clash", 'OK');
                return false;
            }
        }
        return true;
    }
    
    var hideIcons = function (listViewId, eventGroup)
    {
        $j("#" + listViewId + " span.event-" + eventGroup).hide();    
    }
    
    var setUpIcons = function(listViewId, eventGroup, dataSource){
        
        console.log("Setup favourite icons");
        $j("#" + listViewId + " span.event-" + eventGroup).each(function() {
            
            var span = this;

            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (eventItem){
                setupIconSpan(eventGroup, span, isContentIdSelected(eventGroup, eventItem.ContentId));
            }
            
        });
    }
    

    var setUpClickEventOnSelectedIcons=function(listViewId, eventGroup, dataSource, selectionValidationFunction)
    {
        console.log("Set up favourite icons");
        var selectedEventSpans = $j("#" + listViewId + " span.event-" + eventGroup);
        
        console.log("Selected " + eventGroup + " spans = " + selectedEventSpans.length);
        
        $j(selectedEventSpans).click(function(){
            var span=this;
            
            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if ($j(span).hasClass(eventGroup + "-true"))
            {
                setupIconSpan(eventGroup, span, false);
                removeEventFromSelectedData(eventGroup, eventItem);
            }
            else{
                
                if (typeof selectionValidationFunction === 'function')
                {
                    if (!selectionValidationFunction(eventGroup, eventItem))
                    {
                         return;
                    }
                }
                
                setupIconSpan(eventGroup, span, true);
                addEventToSelectedData(eventGroup, eventItem);
            }
            
        });
    };

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
    
    var removeEventFromSelectedData = function(eventGroup, eventItem)
    {
        var selectedEventData= getSelectedEventData(eventGroup);
        
        var contentId = eventItem.ContentId;
        
        if (selectedEventData)
        {
            console.log('Removing Content id: ' + eventItem.ContentId + ' from ' + eventGroup +' with ' + selectedEventData.length + ' entries.');
            
            var eventsWithoutContentId = $j.grep(selectedEventData, function(e){ return e.ContentId !== contentId; });
            
            console.log('Setting selected event data for ' + eventGroup + ' with ' + eventsWithoutContentId.length + 'entries');
            
            setSelectedEventData(eventGroup, eventsWithoutContentId);
        }
        else{
            console.log('Attempt to remove event from non-existent group ' + eventGroup + ' with content id: ' + contentId);
        }
    }
    
    var addEventToSelectedData = function(eventGroup, eventItem)
    {
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
        selectedEventData.push(selectedDataItem);   
        
        setSelectedEventData(eventGroup, selectedEventData);
    
    }
    
    var isAllDayEvent = function (eventItem)
    {
        if (eventItem 
            && (Math.abs(
                        kendo.parseDate(eventItem.EndDate)-kendo.parseDate(eventItem.StartDate)
                        ) / 36e5 > 6)
            )
        {
            return true;
        }
        return false;
    }
    
    var isContentIdSelected = function(eventGroup, contentId)
    {
        var selectedEventData = getSelectedEventData(eventGroup);
        
        var eventsWithContentId = $j.grep(selectedEventData, function(e){ return e.ContentId === contentId; });
        if (eventsWithContentId && eventsWithContentId.length){
            
            return true;
        }
        return false;
    }
       
    var getSelectedEvents = function (eventGroup)
    {
        var eventItems = getEventItems();
        
        var selectedEventItems = [];
        
        if (!eventItems){
            console.log("No event items to filter for selection");
            return;
        }

        var selectedEventData= getSelectedEventData(eventGroup);
        if (!selectedEventData){
            console.log("No selected events so nothing to retrieve");
            return selectedEventItems;
        }
        
        for (index = 0; index < eventItems.length; ++index) {
            var event = eventItems[index];
            var contentId = event.ContentId;
            if (isContentIdSelected(eventGroup, contentId))
            {
                selectedEventItems.push(event);
            }
            
        }
        console.log("Returning " + selectedEventItems.length + " selected events for " + eventGroup);
        return selectedEventItems;
    }

      
    var setSelectedEventData = function(eventGroup, eventData)
    {
        var stringEventData = JSON.stringify(eventData);
        localStorage.setItem(eventsLocalStoragePrefix + eventGroup, stringEventData);    
    }
    
    var getSelectedEventData = function(eventGroup)
    {
        var stringEventData = localStorage.getItem(eventsLocalStoragePrefix + eventGroup);
        if (stringEventData){
            return JSON.parse(stringEventData);
        }
        return [];
        
    }
    
})(window, jQuery);
