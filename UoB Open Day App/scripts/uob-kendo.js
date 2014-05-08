(function (global) {
    
    var uob = global.uob = global.uob || {};
    uob.kendo = uob.kendo || {};
    
    uob.kendo.areFilterArraysIdentical = function(filterArray1, filterArray2)
    {
        var index1;
        var index2;
        var currentComparison;
        
        if (filterArray1.length!== filterArray2.length)
        {
            return false;
        }
        
        for (index1 = 0; index1 < filterArray1.length; ++index1) {
        
            currentComparison = false;
            
            for (index2 = 0; index2 < filterArray2.length; ++index2) {
            
                if (filterArray1.field===filterArray2.field && filterArray1.operator === filterArray2.operator && filter3.value=== filter3.value)
                {
                    currentComparison= true;
                    break;
                }
        	}
            if (currentComparison===false)
            {
                return false;
            }
            
        }
        return true;
    }
    
}
)(window);