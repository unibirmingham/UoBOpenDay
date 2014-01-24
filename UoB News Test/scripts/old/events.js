(function (global) {
    var EventViewModel,
        app = global.app = global.app || {};

    EventViewModel = kendo.data.ObservableObject.extend({
        eventDataSource: null,

        init: function () {
            var that = this,
                dataSource;

            kendo.data.ObservableObject.fn.init.apply(that, []);

            dataSource = new kendo.data.DataSource({
                transport: {
                    read: {
                        //url: "data/event.json",
                        url: "http://www.birmingham.ac.uk/web_services/Events.svc/?folderPath=/schools",
                        dataType: "json"
                    }
                }
            });

            that.set("eventDataSource", dataSource);

            
            $("#pull-with-endless-eventslistview").kendoMobileListView({
                dataSource: dataSource,
                template: $("#events-template").text(),
                pullToRefresh: true,
                endlessScroll: true
            });
            
        }
        
        
        
    });

    app.eventService = {
        viewModel: new EventViewModel()
    };



    
    
})(window);