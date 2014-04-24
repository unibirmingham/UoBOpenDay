(function ($j, global) {
    
    var uob = global.uob = global.uob || {};
    uob.json = uob.json || {};
    uob.log = uob.log || {};
    uob.web = uob.web || {};
    uob.localstorage = uob.localstorage || {};
    
    uob.json.JsonStatus = {
          UNINITIALISED: "Uninitialised",
          LIVE: "Live",
          LOCALSTORAGE: "LocalStorage",
          LOCALFILE: "LocalFile",
          ERROR: "Error"
        };
    
    uob.json.hasData = function(jsonStatus)
    {
        return (jsonStatus === uob.json.JsonStatus.LIVE ||jsonStatus === uob.json.JsonStatus.LOCALSTORAGE ||jsonStatus === uob.json.JsonStatus.LOCALFILE);
    }
    
    //This function assumes that an empty json response should be regarded as a failure.
    uob.json.getJSON = function(dataDescription, jsonUrl, localFile, successFunction, errorFunction, canUseLocalFileWhenLive)
    {
        
        if (!uob.web.is3GOrBetter())
        {
            uob.log.addLogMessage(dataDescription + ": No internet connection so not requesting url: " + jsonUrl + ". Checking cache instead.");
            retrieveDataFromLocalCache(dataDescription, jsonUrl, localFile, successFunction, errorFunction, canUseLocalFileWhenLive);
            return;
        }
        
        uob.log.addLogMessage(dataDescription + ": Requesting from url: " + jsonUrl);
        
        $j.ajax({
            dataType: "json",
            url: jsonUrl,
            success:function(jsonData) {

                if (jsonData.length===0)
                {
                    uob.log.addLogMessage(dataDescription + ": empty data returned");
                    retrieveDataFromLocalCache(dataDescription, jsonUrl, localFile, successFunction, errorFunction, canUseLocalFileWhenLive);
                    return;
                }
                uob.log.addLogMessage(dataDescription + ": " + jsonData.length + " items retrieved");
                setDataInLocalCache(dataDescription, jsonUrl, jsonData);
                successFunction(jsonData, uob.json.JsonStatus.LIVE);
            },
            timeout: 10000
        }).fail( function( xhr, status ) {
            uob.log.addLogMessage(dataDescription + ": Failure getting JSON data from " + jsonUrl + " Error status: " + status + " incoming Text " + xhr.responseText);
            retrieveDataFromLocalCache(dataDescription, jsonUrl, localFile, successFunction, errorFunction, canUseLocalFileWhenLive);
        });
        
    }
    
    var setDataInLocalCache = function(dataDescription, jsonUrl, jsonData)
    {
        console.log(dataDescription + ": Setting data into local cache");
        var stringJsonData = JSON.stringify(jsonData);
        uob.localstorage.setWebContent(jsonUrl, stringJsonData);
        
    }
    
    var retrieveDataFromLocalCache = function(dataDescription, jsonUrl, localFile, successFunction, errorFunction, canUseLocalFileWhenLive)
    {
        console.log(dataDescription + ": Attempting to retrieve event building data from local storage cache");
        var stringJsonData = uob.localstorage.getWebContent(jsonUrl);
        if (stringJsonData){
            var jsonData = JSON.parse(stringJsonData);
            if (jsonData.length>0){
                uob.log.addLogMessage(dataDescription + ': data is from local storage cache.');
                successFunction(jsonData, uob.json.JsonStatus.LOCALSTORAGE);
                return;
            }
            uob.log.addLogMessage(dataDescription + ": no data in local storage cache.");
            
        }
        if (canUseLocalFileWhenLive || app.uobSettings.testMode){
            retrieveDataFromLocalFile(dataDescription, localFile, successFunction, errorFunction);
            return;
        }

        errorFunction();
        
    }
    
    var retrieveDataFromLocalFile = function(dataDescription, localFile, successFunction, errorFunction)
    {
        
        console.log(dataDescription + ": Test mode retrieving data from local file");
        $j.ajax({
            dataType: "json",
            url: localFile,
            success:function(jsonData) {
                if (jsonData.length>0)
                {
                    uob.log.addLogMessage(dataDescription + ": data retrieved from local file");
                    successFunction(jsonData,uob.json.JsonStatus.LOCALFILE);
                    return;
                }
                errorFunction(uob.json.JsonStatus.ERROR);
        },
        timeout: 10000
        }).fail( function( xhr, status ) {
            uob.log.addLogMessage(dataDescription + ": Failure getting JSON data from local file (" + localFile + ") Error status: " + status + " incoming Text " + xhr.responseText);
            errorFunction(uob.json.JsonStatus.ERROR);
        });
        
    }
    uob.json.parseJsonDate = function(jsonDateValue)
    {
        return kendo.parseDate(jsonDateValue);
    }
})(jQuery, window);