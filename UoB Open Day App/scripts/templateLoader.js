var templateLoader = (function($,host){
	//Loads external templates from path and injects in to page DOM. See: http://docs.telerik.com/kendo-ui/howto/load-templates-external-files
	return{
		loadExtTemplate: function(path){
			var tmplLoader = $.get(path)
				.success(function(result){
					//Add templates to DOM
					$("body").append(result);
				})
				.error(function(result){
					alert("Error Loading Templates");
				})
				
			tmplLoader.complete(function(){
				$(host).trigger("TEMPLATE_LOADED", [path]);
			});
		}
	};
})(jQuery, document);