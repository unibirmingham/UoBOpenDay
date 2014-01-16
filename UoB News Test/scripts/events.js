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
                        url: "data/event.json",
                        dataType: "json"
                    }
                }
            });

            that.set("eventDataSource", dataSource);
        }
    });

    app.eventService = {
        viewModel: new EventViewModel()
    };
})(window);