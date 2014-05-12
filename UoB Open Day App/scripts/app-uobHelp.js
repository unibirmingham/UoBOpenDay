
(function (global, $j) {
    
    var app = global.app = global.app || {};
    app.uobHelp = app.uobHelp || {};
    
    
    //Help functions
    app.uobHelp.openHelp = function(e){
        if (app.application.view().id==="#tabstrip-events")
        {
        	app.uobHelp.openEventsListHelp();    
        }
        if (app.application.view().id==="#tabstrip-favourites")
        {
        	app.uobHelp.openFavouritesListHelp();    
        }
        if (app.application.view().id==="#tabstrip-schedule")
        {
        	app.uobHelp.openScheduleListHelp();    
        }
        if (app.application.view().id==="#tabstrip-map")
        {
        	app.uobHelp.openMapHelp();    
        }
    }
    
    app.uobHelp.openEventsListHelp = function(e){
        $j("#modalview-activities-help").data("kendoMobileModalView").open();
    };
    
    app.uobHelp.closeEventsListHelp = function (e){
    	$j("#modalview-activities-help").data("kendoMobileModalView").close();    
    };
    
    app.uobHelp.openFavouritesListHelp = function(e){
        $j("#modalview-favourites-help").data("kendoMobileModalView").open();
    };
    
    app.uobHelp.closeFavouritesListHelp = function (e){
    	$j("#modalview-favourites-help").data("kendoMobileModalView").close();    
    };
        
    app.uobHelp.openScheduleListHelp = function(e){
        $j("#modalview-schedule-help").data("kendoMobileModalView").open();
    };
    
    app.uobHelp.closeScheduleListHelp = function (e){
    	$j("#modalview-schedule-help").data("kendoMobileModalView").close();    
    };
    
	app.uobHelp.openMapHelp = function(e){
        $j("#modalview-map-help").data("kendoMobileModalView").open();
    };
    
    app.uobHelp.closeMapHelp = function (e){
    	$j("#modalview-map-help").data("kendoMobileModalView").close();    
    };
    

    

})(window, jQuery);
