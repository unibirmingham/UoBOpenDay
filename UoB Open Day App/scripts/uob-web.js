(function ($j, global) {
    
    var uob = global.uob = global.uob || {};
    
    uob.web = uob.web || {};
    uob.screen = uob.screen || {};    
    uob.log = uob.log || {};
    uob.localstorage = uob.localstorage || {};
    
    
    var makeUrlAbsolute = function(relativeUrl, urlProtocol, urlDomain)
    {
        console.log('Url conversion on: ' + relativeUrl);
        var newUrl = relativeUrl.replace( "/^'/'/", urlProtocol + urlDomain + '/');
        newUrl = newUrl.replace( /^http:\/\/local\//, urlProtocol + urlDomain + '/');
        console.log('Replacing relative or local url ' + relativeUrl + ' with absolute ' + newUrl);
        return newUrl;
    };
    
    var makeUrl = function(urlProtocol, urlDomain, urlUri)
    {
        return urlProtocol + urlDomain + urlUri;
    }
    
    uob.web.is3GOrBetter = function()
    {

        if (navigator.network.connection.type === Connection.NONE
                                    ||navigator.network.connection.type === Connection.CELL_2G
                                    ||navigator.network.connection.type ===Connection.UNKNOWN)  
        {
            return false;
        }
        return true;
    };
    
    uob.web.insertWebPageContent = function(divId, urlProtocol,  urlDomain, urlUri)
    {
        var $jcontentDiv = $j('#' + divId);        

        if ($jcontentDiv.children().length>0)
        {
            console.log('Div id: ' + divId + ' is already populated with ' + $jcontentDiv.children().length + ' elements');
        }
        else
        {
            $jcontentDiv.html('<p>Loading content ...</p>');
            var url = makeUrl(urlProtocol, urlDomain, urlUri);
            console.log('Populating div id: ' + divId + ' from url ' + url);
            $j.ajax({
                cache: false,
                url: url,
                timeout: 5000,
				success: function(data){
                    //Stash the data:
                    uob.web.insertWebPageIntoDiv(divId, data, urlProtocol, urlDomain, urlUri);
                }
    		}).fail( function( xhr, status ) {
        		uob.log.addLogMessage("Failure getting web page content from " + url + " Error status: " + status + " incoming Text " + xhr.responseText);
                if (uob.localstorage.getWebContent(url))
                {
                    uob.web.insertLocalStorageIntoDiv(divId, urlProtocol, urlDomain, urlUri);
                }
                else{
                    $jcontentDiv.html('<p>Content loading failed. Please connect to internet to get the latest version of this content.</p>');
                    uob.log.addLogWarning("No web content in cache for: " + url);
                }
    		});

        }
    };

    uob.web.insertWebPageIntoDiv = function(divId, webPageContent, urlProtocol, urlDomain, urlUri)
    {

        var $jwebPage = $j(webPageContent);
        contentDiv = $jwebPage.find('#content');
    	uob.localstorage.setWebContent(makeUrl(urlProtocol, urlDomain, urlUri), contentDiv[0].outerHTML);
        uob.web.insertWebPageContentDivIntoDiv(divId, contentDiv, urlProtocol, urlDomain, urlUri);
        
    };
    
    uob.web.insertLocalStorageIntoDiv = function(divId, urlProtocol, urlDomain, urlUri)
    {
        var contentDiv = uob.localstorage.getWebContent(makeUrl(urlProtocol, urlDomain, urlUri));
        
        uob.web.insertWebPageContentDivIntoDiv(divId, contentDiv, urlProtocol, urlDomain, urlUri);
    };
    
    uob.web.insertWebPageContentDivIntoDiv = function(divId, contentDiv, urlProtocol, urlDomain, urlUri)
    {
        var $jreceivingDiv = $j('#' + divId);

        $jcontentDiv = $j(contentDiv);
        var pageTitle = $jcontentDiv.find('h1').first();
        var pageMainContentDiv = $jcontentDiv.find('#mainContent');
        
        //Make the content unique
        pageMainContentDiv.attr('id',divId + "_content");
        
        //Remove existing content
        $jreceivingDiv.text('');
        //Place the title and content into the page                
        $jreceivingDiv.append(pageTitle);
    	$jreceivingDiv.append(pageMainContentDiv);   
        
                        
        //Now Transform any href or src which is relative to be explicit:
        $j("#" + divId + " img[src^='/']").prop( "src",
              function( i, oldSrc ) {
                  return makeUrlAbsolute(oldSrc, urlProtocol, urlDomain);
              }
        );
        
        $j("#" + divId + " a[href^='/']").prop( "href",
              function( i, oldHref ) {
                  return makeUrlAbsolute(oldHref, urlProtocol, urlDomain);
              }
        );            
        
        //Now add some code which forces any links in the added content to be opened in the main browser
        $j('#' + divId).on('click','a', function(e) {
            e.preventDefault();
            var elem = $(this);
            var url = elem.attr('href');
            console.log("Anchor clicked on");
            if (url.indexOf('http://') !== -1) {
                console.log("Opening " + url + " externally");
                window.open(url, '_system');
            }
        });
        
    }
    
    uob.web.checkUrl = function(serviceDescription, url, callback)
    {
     
        uob.log.addLogMessage(serviceDescription + ": Requesting from url: " + url);
        
        if (!uob.web.is3GOrBetter())
        {
            uob.log.addLogMessage(serviceDescription + ": No internet connection so not requesting url: " + url);
            callback(false);
        }
        
        uob.log.addLogMessage(serviceDescription + ": Requesting from url: " + url);
                
        $j.ajax({
            cache: false,
            type: 'GET',
            url: url,
            timeout: 10000,
            success: function(data, textStatus, XMLHttpRequest) {
                if (!data) {
                    uob.log.addLogError(serviceDescription + " is not responding correctly. Status: " + textStatus);
                    callback(false);
                }
                else{
                    uob.log.addLogMessage("Successfully requested url " + url + " for " + serviceDescription + " with status: " + textStatus);
                    callback(true);
                    }
                
              },
            error: function(jqXHR, textStatus, errorThrown){
                uob.log.addLogError(serviceDescription + " is not responding. Status:" + textStatus);
                callback(false);
            }
        });
    }
   
})(jQuery, window);