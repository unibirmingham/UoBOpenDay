(function ($j, global) {
    
    var uob = global.uob = global.uob || {};
    
    uob.web = uob.web || {};
    
    uob.screen = uob.screen || {};
    
    uob.log = uob.log || {};
    
    
    var makeUrlAbsolute = function(relativeUrl, urlProtocol, urlDomain)
    {
        console.log('Url conversion on: ' + relativeUrl);
        var newUrl = relativeUrl.replace( "/^'/'/", urlProtocol + urlDomain + '/');
        newUrl = newUrl.replace( /^http:\/\/local\//, urlProtocol + urlDomain + '/');
        console.log('Replacing relative or local url ' + relativeUrl + ' with absolute ' + newUrl);
        return newUrl;
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
    }
    
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
            var url = urlProtocol + urlDomain + urlUri;
            console.log('Populating div id: ' + divId + ' from url ' + url);
            
            $j.get(url, function(data){             
                //Get the title and main content from the page to display
                var $jwebPage = $j(data);
                var pageTitle = $jwebPage.find('div#content h1').first();
                var pageMainContentDiv = $jwebPage.find('#mainContent');
              
                //Make the content unique
                pageMainContentDiv.attr('id',divId + "_content");
                
                //Remove existing content
                $jcontentDiv.text('');
                //Place the title and content into the page                
                $jcontentDiv.append(pageTitle);
            	$jcontentDiv.append(pageMainContentDiv);                               
                                
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
            });    
        }
    };
    
    uob.web.checkWebConnection = function(buttonClass)
    {
        
        if (uob.web.is3GOrBetter())
        {
            uob.log.addLogMessage("3G or better internet connection is present");
            uob.screen.enableLinks(buttonClass);
            return;
        }
        uob.log.addLogMessage("No web connection");
        
    }
    
    uob.web.checkUrl = function(serviceDescription, url, buttonClass)
    {
     
        uob.log.addLogMessage(serviceDescription + ": Requesting from url: " + url);
        
        if (!uob.web.is3GOrBetter())
        {
            uob.log.addLogMessage(serviceDescription + ": No internet connection so not requesting url: " + url);
            return;
        }
        
        uob.log.addLogMessage(serviceDescription + ": Requesting from url: " + url);
                
        $j.ajax({
            cache: false,
            type: 'GET',
            url: url,
            timeout: 10000,
            success: function(data, textStatus, XMLHttpRequest) {
                if (!data) {
                    uob.log.addErrorMessage(serviceDescription + " is not responding correctly.");
                }
                else{
                    uob.log.addLogMessage("Successfully requested url " + url + " for " + serviceDescription + " with status: " + textStatus);
                    uob.screen.enableLinks(buttonClass);
                    }
              },
            error: function(jqXHR, textStatus, errorThrown){
                uob.log.addErrorMessage(serviceDescription + " is not responding.");
            }
        });
    }
    
})(jQuery, window);