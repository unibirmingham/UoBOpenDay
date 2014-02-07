
//EVENTS

(function (global, $j) {
    
    app = global.app = global.app || {};
    
    var _retrievedEventsData;
    var _eventsDataSource;
    var favouriteEventsLocalStorage = "favouriteEvents";

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
    
    var getEventsData = function ()
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
                data: getEventsData(),
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
                setUpFavouriteIcons(eventsListViewId, eventsListDataSource);
                setUpClickEventOnFavouriteIcons(eventsListViewId, eventsListDataSource);
            } 
            
        });
        
    };

    app.populateFavouriteEventList = function (e){
        
        var eventsListViewId = "open-day-favourite-events-view";
        
        var eventsListDataSource = new kendo.data.DataSource({
                data: getFavouriteEvents(),
                pageSize: 10000
            });
        
        $j("#" + eventsListViewId).kendoMobileListView({
            dataSource: eventsListDataSource,
            template: $j("#events-template").text(),
            dataBound: function(){
                setUpFavouriteIcons(eventsListViewId, eventsListDataSource);
            } 
            
        });
        
    };
    
    var setUpFavouriteIcons = function(listViewId, dataSource){
        
        console.log("Setup favourite icons");
        $j("#" + listViewId + " span.event-favourite").each(function() {
            
            var span = this;

            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
            
            if (eventItem){
                setupIconSpan(span, isContentIdFavourite(eventItem.ContentId));
            }
            
        });
    }
    

    var setUpClickEventOnFavouriteIcons=function(listViewId, dataSource)
    {
        console.log("Set up favourite icons");
        var favouriteSpans = $j("#" + listViewId + " span.event-favourite");
        
        console.log("Favourite spans = " + favouriteSpans.length);
        
        $j(favouriteSpans).click(function(){
            var span=this;
            
            var uid = $j(span).parent().parent().parent().attr('data-uid');
            
            var eventItem = dataSource.getByUid(uid);
                        
            if ($j(span).hasClass("km-favourite-true"))
            {
                setupIconSpan(span, false);
                removeEventFromFavourites(eventItem);
            }
            else{
                setupIconSpan(span, true);
                addEventToFavourites(eventItem);
            }
            
        });
    };

    var setupIconSpan = function (span, isFavourite)
    {
        if (isFavourite)
        {
            $j(span).removeClass("km-favourite-false");
            $j(span).addClass("km-favourite-true");   
        }
        else{
             $j(span).removeClass("km-favourite-true");
            $j(span).addClass("km-favourite-false");
        }
    }
    
    var removeEventFromFavourites = function(eventItem)
    {
        var favourites= getFavourites();
        
        if (favourites)
        {
            var contentIdIndex = favourites.indexOf(eventItem.ContentId);
            
            if (contentIdIndex > -1) {
                console.log('Removing Content id: ' + eventItem.ContentId + ' from favourites.');   
                favourites = favourites.filter(function(i) {
	                return i != eventItem.ContentId;
                });
            }
            else{
                console.log('Content id: ' + eventItem.ContentId + ' for removal from favourites not found');
            }
        }
        else{
            console.log('Attempt to remove event from non-existent favourite with content id: ' + eventItem.ContentId);
        }
        setFavourites(favourites);
    }
    
    var addEventToFavourites = function(eventItem)
    {
        var favourites= getFavourites();
        
        if (!favourites)
        {
            console.log("Initialising favourites");
            favourites = [];
        }
        console.log('Adding content id ' + eventItem.ContentId + ' to favourites');
        favourites.push(eventItem.ContentId);   
        
        setFavourites(favourites);
    
    }
       
    var getFavouriteEvents = function ()
    {
        var eventItems = getEventsData();
        
        var favouriteEvents = [];
        
        if (!eventItems){
            console.log("No event items to filter for favourites");
            return;
        }

        var favourites= getFavourites();
        if (!favourites){
            console.log("No favourites so nothing to retrieve");
            return favouriteEvents;
        }
        
        for (index = 0; index < eventItems.length; ++index) {
            var event = eventItems[index];
            var contentId = event.ContentId;
            if (favourites.indexOf(contentId)!=-1)
            {
                favouriteEvents.push(event);
            }
            
        }
        console.log("Returning " + favouriteEvents.length + " favourite events");
        return favouriteEvents;
    }
        
    var setFavourites = function(favourites)
    {
        var stringFavourites = JSON.stringify(favourites);
        localStorage.setItem(favouriteEventsLocalStorage, stringFavourites);    
    }
    
    var getFavourites = function()
    {
        var stringFavourites = localStorage.getItem(favouriteEventsLocalStorage);
        return JSON.parse(stringFavourites);
    }
   
    var isContentIdFavourite = function(contentId)
    {
        
        var favourites = getFavourites();
        if (favourites){
            return (favourites.indexOf(contentId)!=-1);
        }
        return false;
        
    }
    
})(window, jQuery);
