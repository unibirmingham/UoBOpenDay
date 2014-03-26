(function (global, $j) {
    
    var app = global.app = global.app || {};
    var uob = global.uob = global.uob || {};
    uob.web = uob.web || {};
    
    app.webpage = app.webpage || {};

    app.webpage.getFAQs = function(e) {
        
        uob.web.insertWebPageContent('faqsContent', 'http://', uob.url.WebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
    app.webpage.getGettingHere = function(e) {
        
        uob.web.insertWebPageContent('gettingHereContent', 'http://', uob.url.WebSite, '/undergraduate/visit/travel.aspx');
        
    }
    
})(window, jQuery);