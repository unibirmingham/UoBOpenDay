(function (global, $j) {
    
    var app = global.app = global.app || {};
    var uob = global.uob = global.uob || {};
    uob.web = uob.web || {};

    app.populateFAQs = function(e) {
        
        uob.web.insertWebPageContent('faqsContent', 'http://', uob.url.WebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
})(window, jQuery);