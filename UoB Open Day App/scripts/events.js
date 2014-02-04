
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
        pullToRefresh: true
    });
    
}

function setEventsError(errorText){
    $('#tabstrip-events div.events-error').html(errorText);
}