
//EVENTS

(function (global, $j) {
    
    var app = global.app = global.app || {};
    app.openDay = app.openDay || {};
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.events = uob.events || {};
    uob.url = uob.url || {};
    
    var scheduleEventsListViewId = "open-day-schedule-events-view";
    var scheduleEventGroup = 'schedule';
    var favouriteEventGroup = 'favourite';
      
    app.populateEventList = function (e){
        
        var eventsListViewId = "open-day-events-view";
        
        var activityFilter = $j("#event-activity-type-filter").data("kendoDropDownList");
        
        var filterFunction = null;
        
        if (!activityFilter){
        
            var activityTypes = [
                            {activityTypeDescription: "All", activityTypeKeyword: ""},
                            {activityTypeDescription: "Subject events", activityTypeKeyword: "Open-Day-Subject"},
                            {activityTypeDescription: "General events", activityTypeKeyword: "Open-Day-General"}
                            ];
            
            $j("#event-activity-type-filter").kendoDropDownList({
                dataTextField: "activityTypeDescription",
                dataValueField: "activityTypeKeyword",
                dataSource: activityTypes,
                change: app.populateEventList
            });            
            
            activityFilter =  $j("#event-activity-type-filter").data("kendoDropDownList");
        }        
        
        var openDayDate = app.openDay.getOpenDayDateAsDate();
        console.log("Filtering by " + activityFilter.value() + " and date: " + openDayDate);
        filterFunction = function(eventItem){
            
            //Make sure the day matches
            if (!uob.date.daysMatchInUK(eventItem.StartDate, openDayDate))
            {
                return false;
            }
            //Make sure the activity type filters:
            var activityType = activityFilter.value();
            if (activityType){
                return (eventItem.Keywords.indexOf(activityType) >=0);
            }
            //There's no filter
            return true;
        };
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: uob.events.eventsRepository.getEventItems(filterFunction),
                pageSize: 10000
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
                        field: "Title",
                        operator: "contains"
                    },
                dataBound: function(){
                    setUpIcons(eventsListViewId, favouriteEventGroup, this.dataSource);
                    setUpClickEventOnSelectedIcons(eventsListViewId, favouriteEventGroup, this.dataSource);
                    setUpIcons(eventsListViewId, scheduleEventGroup, this.dataSource);
                    setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, this.dataSource, true);
                      
                } 
                
            });
       }
        
    };

    app.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var openDayDate = app.openDay.getOpenDayDateAsDate();
        var filterFunction = function(eventItem){
            
            //Make sure the day matches
            return uob.date.daysMatchInUK(eventItem.StartDate, openDayDate);
        };
        
        var eventsListDataSource = new kendo.data.DataSource({
                data:  uob.events.eventsRepository.getSelectedEventItems(favouriteEventGroup, false, filterFunction),
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
                    hideIcons(eventsListViewId, favouriteEventGroup);
                    setUpIcons(eventsListViewId, scheduleEventGroup,this.dataSource);
                    setUpClickEventOnSelectedIcons(eventsListViewId, scheduleEventGroup, this.dataSource, true);
                    reportNoData(eventsListViewId, this.dataSource.data(), "You have no favourite activities selected.");
                } 
            });
        }
        
    };
    
    app.populateScheduleEventList = function (e){
        
        var openDayDate = app.openDay.getOpenDayDateAsDate();
        
         var filterFunction = function(eventItem){
            
            //Make sure the day matches
            return uob.date.daysMatchInUK(eventItem.StartDate, openDayDate);
        };
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: uob.events.eventsRepository.getSelectedEventItems(scheduleEventGroup, true, filterFunction),
                sort: [
                    { field: "getScheduleStartDate()", dir: "asc" },
                    { field: "Title", dir: "asc" }
                  ],
                pageSize: 10000
            });
        
        if ($j("#" + scheduleEventsListViewId).data("kendoMobileListView"))
        {
            console.log("Updating schedule list view data source");
            $j("#" + scheduleEventsListViewId).data("kendoMobileListView").setDataSource(eventsListDataSource);
        }
        else{
            console.log("Initialising schedules list view");
            $j("#" + scheduleEventsListViewId).kendoMobileListView({
                dataSource: eventsListDataSource,
                template: $j("#events-schedule-template").text(),
                dataBound: function(){
                    hideIcons(scheduleEventsListViewId, favouriteEventGroup);
                    hideIcons(scheduleEventsListViewId, scheduleEventGroup);
                    setupMoveUpAndDown(scheduleEventsListViewId, this.dataSource);
                    reportNoData(scheduleEventsListViewId, this.dataSource.data(), "You have no scheduled activities selected.");
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
            var moveUp = false;
            var moveDown = false;
            
            if (eventItem.isAllDayEvent())
            {
                console.log("Make move up visible");
                var data = {dataSource: dataSource};
                if (eventItem.getScheduleStartDate()>eventItem.StartDate){
                    moveUp = true;
                }
                if (eventItem.getScheduleEndDate()<eventItem.EndDate){
                    moveDown = true;
                }
            }
            
            if (moveUp)
            {
                $j(div).find('span.event-move-up').removeClass('moveup-false').addClass('moveup-true').kendoTouch({
                         enableSwipe: false,
                         touchstart: scheduleMoveClick
                    });
            }
            else{
                //Hide and remove click bindings
                $j(div).find('span.event-move-up').removeClass('moveup-true').addClass('moveup-false').off('click');
            }
            
            if (moveDown){
                 $j(div).find('span.event-move-down').removeClass('movedown-false').addClass('movedown-true').kendoTouch({
                         enableSwipe: false,
                         touchstart: scheduleMoveClick
                    });
            }
            else{
                $j(div).find('span.event-move-down').removeClass('movedown-true').addClass('movedown-false').off('click');      
            }
             
        });
    }
    
    var scheduleMoveClick = function(event)
    {
        var span=this.element[0];
        //Get UID:
        var currentLi = $j(span).parent().parent().parent();
        var uid = $j(currentLi).attr('data-uid');
        //Get datasource:
        
        var dataSource = currentLi.parent().data("kendoMobileListView").dataSource;   
        
        var eventItem = dataSource.getByUid(uid);
        
        var moveEvent;
        
        if ($j(span).hasClass('event-move-up'))
        {
            moveEvent = uob.events.eventsRepository.moveEventEarlierInSchedule(scheduleEventGroup, eventItem);
        }
        else{
            moveEvent = uob.events.eventsRepository.moveEventLaterInSchedule(scheduleEventGroup, eventItem);
        }

        if (!moveEvent)
        {
            navigator.notification.alert("Cannot move activity in schedule -- you may need to move some of your other events to fit it in.", null,"Schedule clash", 'OK');
        }
        
        app.populateScheduleEventList();
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
        $j("#" + listViewId + " span.event-" + eventGroup).hide();    
    }
    
    var setUpIcons = function(listViewId, eventGroup, dataSource){
        
        console.log("Setup favourite icons");
        $j("#" + listViewId + " span.event-" + eventGroup).each(function() {
            
            var span = this;

            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (eventItem){
                setupIconSpan(eventGroup, span, uob.events.eventsRepository.isContentIdSelected(eventGroup, eventItem.ContentId));
            }
            
        });
    }
    
    var setUpClickEventOnSelectedIcons=function(listViewId, eventGroup, dataSource, scheduledEvent)
    {
        console.log("Set up favourite icons");
        var selectedEventSpans = $j("#" + listViewId + " span.event-" + eventGroup);
        
        console.log("Selected " + eventGroup + " spans = " + selectedEventSpans.length);
        
        $j(selectedEventSpans).kendoTouch({
            enableSwipe: false,
            touchstart: function (e){
                    var span=this.element[0];
                    
                    var uid = $j(span).parent().parent().parent().attr('data-uid');
                    
                    var eventItem = dataSource.getByUid(uid);
                    
                    if ($j(span).hasClass(eventGroup + "-true"))
                    {
                        setupIconSpan(eventGroup, span, false);
                        uob.events.eventsRepository.removeEventFromSelectedData(eventGroup, eventItem);
                    }
                    else{
                        if(uob.events.eventsRepository.addEventToSelectedData(eventGroup, eventItem, scheduledEvent))
                        {
                            setupIconSpan(eventGroup, span, true);
                        }
                        else{
                            navigator.notification.alert("Cannot add '" + eventItem.Title + "' (" + kendo.toString(eventItem.StartDate, 'HH:mm') + " - " + kendo.toString(eventItem.EndDate, 'HH:mm') + ") to the schedule -- please check your schedule for clashing events.", null,"Schedule clash", 'OK');
                        }
                    }
                return false;
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
 

})(window, jQuery);
