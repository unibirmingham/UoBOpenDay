
//EVENTS
function populateEventList(e) {
    app.application.showLoading();
    
    var openDayEventsUrl = app.UoBEventsService + '?category=Open Day';
    
    var dataSource = new kendo.data.DataSource({
        transport: {
            read: {
                url: openDayEventsUrl,
                timeout: 30000,
                dataType: "json"
            }
        },
        pageSize: 10000,
        change: function (data) {
            console.log('Change event');
            if (data.items){
                console.log("Items:" + data.items.length);
                setFavourites(data);
            }                      
            
            setEventsError('');
            app.application.hideLoading();
        },
        error: function(e) {
            var statusCode = e.status;
            var errorThrown = e.errorThrown;
            setEventsError("Error retrieving events: " + statusCode + " (" + errorThrown + ")");
            app.application.hideLoading();
            
        }
    });

    $("#open-day-events-view").kendoMobileListView({
        dataSource: dataSource,
        template: $("#events-template").text(),
         filterable: {
                field: "Title",
                operator: "contains"
            },
        pullToRefresh: true,
        dataBound: setUpFavouriteIcons
        
        
    });
    
}

var setUpFavouriteIcons=function()
{
    console.log("Set up favourite icons");
    var favouriteSpans = $("#open-day-events-view span.event-favourite");
    
    console.log("Favourite spans = " + favouriteSpans.length);
    
    $(favouriteSpans).click(function(){
        var span=this;
        if ($(span).hasClass("km-favourite-true"))
        {
            $(span).removeClass("km-favourite-true");
            $(span).addClass("km-favourite-false");
        }
        else{
             $(span).removeClass("km-favourite-false");
            $(span).addClass("km-favourite-true");   
        }
    });
};

function setEventsError(errorText){
    $('#tabstrip-events div.error-message').html('<p>' + errorText + '</p>');
}

function setFavourites(data)
{
    if (!data.items){
        return;
    }
    
    ensureEventsHaveFavouriteProperty(data);
    
    var favourites= localStorage.getItem('favouriteEvents');
    if (!favourites){
        return;
    }
    
    data.foreach(function(event)
    {
        var contentId = event.ContentId;
        
        event.Favourite = (favourites.indexOf(contentId)!=-1);
         
    });
       
}

function ensureEventsHaveFavouriteProperty(data)
{
    if (data.items){
        for (index = 0; index < data.items.length; ++index) {
            var item = data.items[index];
            if (typeof item.Favourite == 'undefined')
            {
                item.Favourite=false;
            }
            else{
                //Favourite exists so drop out
                break;
            }
        }
    }
}
