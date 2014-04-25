(function ($j, global) {
    
    var app = global.app = global.app || {};
    var uob = global.uob = global.uob || {};
    uob.log = uob.log || {};
	uob.kendo = uob.kendo || {};
    
    
    //Function to set data in a datasource on a list view including this workaround (http://www.telerik.com/forums/scrolling-stops-working-when-setting-data-source)
    uob.kendo.setDataOnListViewDataSource = function(listviewDataSource, dataArray){

        uob.log.addLogMessage("Updating datasource with kendo scrolling workaround");
        listviewDataSource.data(dataArray);
        
        var scroller = app.application.scroller();
        var touches = scroller.userEvents.touches;
        var dummyEvent = { event: { preventDefault: $j.noop } };

        for (var i = 0; i < touches.length; i ++) {
            touches[i].end(dummyEvent);
        }

        scroller.reset();
        
    };

})(jQuery, window);
