(function (global, $j) {
    
    app = global.app = global.app || {};
    uob = global.uob = global.uob || {};
    web = uob.web = uob.web || {};

    app.populateFAQs = function(e) {
        
        uob.web.insertWebPageContent('faqsContent', 'http://', uob.url.WebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
})(window, jQuery);