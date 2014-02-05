(function (global, $j) {
    
    app = global.app = global.app || {};

    app.populateRegistrationInfo = function(e) {
        
        window.app.UoBInsertWebPage('registrationContent', 'http://', app.UoBWebSite, '/undergraduate/visit/OpenDayFAQs.aspx');
        
    }
   
})(window, jQuery);