(function (global, $j) {
    
    app = global.app = global.app || {};

    app.populateFAQs = function(e) {
        
        window.app.UoBInsertWebPage('faqsContent', 'http://', uob.url.WebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
})(window, jQuery);