(function (global) {
    
    var uob = global.uob = global.uob || {};
    uob.date = uob.date || {};
    
    uob.date.formatDateAsUK = function(date, format)
    {
        
        var newDate = moment(date).tz('Europe/London');
        
        var format = newDate.format(format);
        
        return format;
        
    }

    uob.date.daysMatchInUK = function(date1, date2)
    {

        return (
            moment(date1).tz('Europe/London').format('DD')=== moment(date2).tz('Europe/London').format('DD')
            && moment(date1).tz('Europe/London').format('MM')=== moment(date2).tz('Europe/London').format('MM')
            && moment(date1).tz('Europe/London').format('YYYY')=== moment(date2).tz('Europe/London').format('YYYY')
            );
        
        
    }
    
}
)(window);