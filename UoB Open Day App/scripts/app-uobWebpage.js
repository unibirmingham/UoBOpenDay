(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.web = uob.web || {};
    
    var app = global.app = global.app || {};
    app.uobWebpage = app.uobWebpage || {};

    app.uobWebpage.getFAQs = function(e) {
        
        uob.web.insertWebPageContent('faqsContent', 'http://', app.uobSettings.WebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
    app.uobWebpage.getGettingHere = function(e) {
        
        uob.web.insertWebPageContent('gettingHereContent', 'http://', app.uobSettings.WebSite, '/undergraduate/visit/travel.aspx');
        
    }
    
})(window, jQuery);