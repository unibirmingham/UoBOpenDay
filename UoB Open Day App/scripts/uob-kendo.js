/*jslint browser: true, devel: true, white: true */ /*global jQuery*/ 
(function (global, $j) {
    "use strict";
    
    var uob;
    
    global.uob = global.uob || {};
    uob = global.uob;
    uob.kendo = uob.kendo || {};
    
    uob.kendo.getListViewDataSourceForElement = function (element){
    
        var currentElement = element,
            currentListViewData,
            dataSource;
        
        while(!dataSource){
        
            currentListViewData = currentElement.data("kendoMobileListView");
            
            if (currentListViewData){
                dataSource = currentListViewData.dataSource;
                break;
            }
            currentElement = currentElement.parent();
            
            if (!currentElement){
                break;
            }
        }
        
        return dataSource;
        
    };
    
    uob.kendo.getListViewUidForElement = function (element){
    
        var currentElement = $j(element),
            uid;
        
        while(!uid){
        
            uid = currentElement.attr('data-uid');
            currentElement = currentElement.parent();
            
            if (!currentElement){
                break;
            }
        }
        
        return uid;
        
    };
    
}(window, jQuery));