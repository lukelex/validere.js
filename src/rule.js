(function(){
  function rule( spec ){
    spec.inheritanceRule = buildInheritanceRule( spec.inherits )

    spec.setParams = function setParams( _ ){ return spec; };

    spec.getExtraInfo = function getExtraInfo( _ ){ return spec; };

    spec.check = function check( fieldName, value ){
      var result = {
        isOk: checkWithHierarchy( fieldName, value )
      };

      if ( !result.isOk ) {
        result.message = spec.message.replace( /\%s/, fieldName );
      }

      return result;
    };

    function buildInheritanceRule( inherits ){
      if ( inherits ) {
        return retrieve( inherits );
      } else {
        return { check: function(){ return { isOk: true }; } };
      }
    }

    function checkWithHierarchy( fieldName, value ){
      return spec.inheritanceRule.check(
        fieldName, value
      ).isOk && spec.validator( value );
    }

    return spec;
  } window.valkyr.rule = rule;

  window.buildRule = rule.build = function build( spec ){
    var newRule = rule( spec );
    window.valkyr.customRules[ spec.name ] = newRule;
    return newRule;
  };

  function retrieve( ruleName ){
    var rule = window.valkyr.predefinedRules.find( ruleName )
            || window.valkyr.customRules[ ruleName ];

    if ( !rule ) { throw "Rule " + ruleName + " does not exist!"; }

    return rule;
  } rule.retrieve = retrieve;
})();
