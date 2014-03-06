(function (global, $j) {
    
    var uob = global.uob = global.uob || {};
    uob.screen= uob.screen || {};    
    
    uob.screen.enableLinks = function(classToEnable)
    {
        $j("#tabstrip-home li." + classToEnable).removeClass(classToEnable);
        $j("#appFooter a." + classToEnable).removeClass(classToEnable);
    }
    
})(window, jQuery);
