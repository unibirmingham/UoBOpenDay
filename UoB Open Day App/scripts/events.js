
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
        serverPaging: true,
        pageSize: 28,
        change: function (data) {
            setEventsError('');
            app.application.hideLoading();
        },
        error: function(e) {
            var xhr = e.xhr;
            var statusCode = e.status;
            var errorThrown = e.errorThrown;
            setEventsError("Error retrieving events: " + statusCode + " (" + errorThrown + ")");
            app.application.hideLoading();
            
        }
    });

    $("#open-day-events-view").kendoMobileListView({
        dataSource: dataSource,
        template: $("#events-template").text(),
        pullToRefresh: true,
        endlessScroll: true
    });
    
}

function setEventsError(errorText){
    $('#tabstrip-events div.events-error').html(errorText);
}