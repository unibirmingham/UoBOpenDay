var gaPlugin;
                
function initialize() {
    document.addEventListener("deviceready", onDeviceReady, true);
}
                
function onDeviceReady() {
    
    gaPlugin = window.plugins.gaPlugin;
    log("stored:" + localStorage.getItem('allowUsageTracking'));
                                
    //if no variable stored locally, create one and set value as undefined
    if (!localStorage.getItem('allowUsageTracking')) {
        localStorage.setItem('allowUsageTracking','unset');
    }
    console.log("AllowUsageTracking: " + localStorage.getItem('allowUsageTracking'));
                            
    if (localStorage.getItem('allowUsageTracking')!="deny") {
        gaPlugin.init(nativePluginResultHandler, nativePluginErrorHandler, "UA-47250154-1", 5);
        log('gaPlugin initialised');
    }

    $('#clearLog').on('click', function() {
        $('#log').val('');
    });
                        
}
 
//GA plugin
function nativePluginResultHandler (result) {
    log('nativePluginResultHandler: '+result);
}
        
function nativePluginErrorHandler (error) {
    log('nativePluginErrorHandler: '+error);
}
                        
function ScreenButtonClicked(page) {
    var lsi = localStorage.getItem('allowUsageTracking');
    if (lsi == "allow" || lsi == "unset") {
        gaPlugin.trackPage( nativePluginResultHandler, nativePluginErrorHandler, page);        
    }                            
}
                        
function goingAway() {
    gaPlugin.exit(nativePluginResultHandler, nativePluginErrorHandler);
}
    

//EVENTS
function eventListViewPullWithEndless(e) {
    var dataSource = new kendo.data.DataSource({
        transport: {
            read: {
                url: "http://www.birmingham.ac.uk/web_services/Events.svc/?folderPath=/events",
                dataType: "json"
            }
        },   
        serverPaging: true,
        pageSize: 40
    });

    $("#pull-eventslistview").kendoMobileListView({
        dataSource: dataSource,
        template: $("#events-template").text(),
        pullToRefresh: true,
        endlessScroll: true
    });

    ScreenButtonClicked("events");
    log("stored:" + localStorage.getItem('allowUsageTracking'));
}

//NEWS
function newsListViewPullWithEndless(e) {
    var dataSource = new kendo.data.DataSource({
        transport: {
            read: {
                url: "http://www.bbc.co.uk/tv/programmes/genres/drama/scifiandfantasy/schedules/upcoming.json?take=6&skip=0&page=1&pageSize=6",
                //url: "data/progs.json",
                dataType: "json"
            }
        },
        schema: {
            data: function(response) {
                return response.broadcasts;
            }
        },
        serverPaging: true,
        pageSize: 6
    });
        
    $("#pull-newslistview").kendoMobileListView({
        dataSource: dataSource,
        template: $("#news-template").text(),
        pullToRefresh: true
    });
        
    ScreenButtonClicked("news");
    log("stored:" + localStorage.getItem('allowUsageTracking'));
}
    
//SETTINGS screen
function settingsInit() {
    var switchVal = true;
    if (localStorage.getItem('allowUsageTracking')==="deny") {
        switchVal = false;    
    }
    $("#usage-tracking-switch").kendoMobileSwitch({
        checked: switchVal,
        onLabel: "Allow",
        offLabel: "Deny"
    });
    ScreenButtonClicked("settings");
    log("stored:" + localStorage.getItem('allowUsageTracking'));
}

//INFO Screen
function infoInit() {
    ScreenButtonClicked("info");
    log("stored:" + localStorage.getItem('allowUsageTracking'));
}

//WEATHER Screen    
function weatherInit() {
    ScreenButtonClicked("weather");
    log("stored:" + localStorage.getItem('allowUsageTracking'));
}
    
function guideInit() {
        ScreenButtonClicked("pocket-guide");
        log("stored:" + localStorage.getItem('allowUsageTracking'));
}
    
function mapInit() {
        ScreenButtonClicked("map");
        log("stored:" + localStorage.getItem('allowUsageTracking'));
}

//Manage change of user preferences (GA tracking)
function onTrackingChange(e) {
    log("Change");
    var allowTrackingVal;
    if (e.checked) {
        allowTrackingVal = "allow";
    }
    else {
        allowTrackingVal = "deny";
    }
    localStorage.setItem('allowUsageTracking', allowTrackingVal);
    if (allowTrackingVal=="deny"){
        gaPlugin.exit(nativePluginResultHandler, nativePluginErrorHandler);
        log("stop");
    }
    else {
        gaPlugin.init(nativePluginResultHandler, nativePluginErrorHandler, "UA-47250154-1", 5);
        log("start");
    }
}

//LOGGING    
function log(msg) {
    $('#log').val($('#log').val() + msg + '\n');
}



