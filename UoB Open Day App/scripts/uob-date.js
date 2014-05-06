(function (global) {
    
    var uob = global.uob = global.uob || {};
    uob.date = uob.date || {};
    
    uob.date.formatDateAsUK = function(date, format)
    {
        
        var newMoment = moment(date).tz('Europe/London');
        
        var formattedDate = newMoment.format(format);
        
        return formattedDate;
        
    }

    uob.date.daysMatchInUK = function(date1, date2)
    {

        var date1text = new moment(date1).tz('Europe/London').format('YYYY-MM-DD');
        var date2text = new moment(date2).tz('Europe/London').format('YYYY-MM-DD');
        
        //date1text = moment(date1).utc().format('YYYY-MM-DD');
        //date2text = moment(date2).utc().format('YYYY-MM-DD');
        
        return (date1text=== date2text);
    }
    
}
)(window);