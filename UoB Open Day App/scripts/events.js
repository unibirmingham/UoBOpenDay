
//EVENTS
function populateEventList(e) {
    app.application.showLoading();
    
    var openDayEventsUrl = 'http://' + app.UoBOpenDayWebsite + '/web_services/Events.svc/?category=Open Day';
    
    var dataSource = new kendo.data.DataSource({
        transport: {
            read: {
                url: openDayEventsUrl,
                dataType: "json"
            }
        },
        serverPaging: true,
        pageSize: 28,
        change: function (data) {
            app.application.hideLoading();
        }
    });

    $("#pull-eventslistview").kendoMobileListView({
        dataSource: dataSource,
        template: $("#events-template").text(),
        pullToRefresh: true,
        endlessScroll: true
    });
    
}