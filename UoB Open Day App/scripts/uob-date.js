(function (global) {
    
    var uob = global.uob = global.uob || {};
    uob.date = uob.date || {};
    
    uob.date.formatDateAsUK = function(date, format)
    {
        
        var newDate = moment(date).tz('Europe/London');
        
        var format = newDate.format(format);
        
        return format;
        
    }

}
)(window);