(function ($j, global) {
 
    var uob = global.uob = global.uob || {};
    uob.localstorage = uob.localstorage || {};
    uob.log = uob.log || {};
    uob.web = uob.web || {};
 
    var getLocalStorageCacheNameFromWebUrl = function(webUrl)
    {
        return webUrl.replace("http://", "").replace("https://","").replace("/", "-").replace("\\","-");
    }
    
    uob.localstorage.setWebContent = function(webUrl, content)
    {
        console.log("Setting web content for " + webUrl + " in local storage.");
        var localStorageCacheName = getLocalStorageCacheNameFromWebUrl(webUrl);
        localStorage.setItem(localStorageCacheName, content);
    }
    
    uob.localstorage.getWebContent = function (webUrl)
    {
        console.log("Getting web content for " + webUrl + " from local storage.");
        var localStorageCacheName = getLocalStorageCacheNameFromWebUrl(webUrl);
        var content = localStorage.getItem(localStorageCacheName);
        return content;
    }
    
    uob.localstorage.hasWebContent= function(webUrl)
    {
    	return (uob.localstorage.getWebContent(webUrl));
    }
    
    
}(jQuery, window));