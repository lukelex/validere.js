// ==========================================================================
// Project:   Valkyr.js - The power of judgment over your forms!
// Copyright: Copyright 2014 Lukas Alexandre
// License:   Licensed under MIT license
//            See https://github.com/lukelex/valkyr.js/blob/master/LICENSE
// ==========================================================================

// Version: 0.2.1 | From: 20-02-2014

window.valkyr = {
  customRules: {}
};

(function(){
  Function.prototype.method = function(name, func){
    if (!this.hasOwnProperty(name)) {
      this.prototype[name] = func;
      return this;
    }
  }
})();

(function(){
  function Rule(config){
    this.$$name            = config.name;
    this.$$message         = config.message;
    this.$$validator       = config.validator;
    this.$$inheritanceRule = buildInheritanceRule(config.inherits);
  }

  function buildInheritanceRule(inherits){
    if (inherits) {
      return Rule.$retrieve(inherits);
    } else {
      return { $check: function(){ return {isOk: true}; } };
    }
  }

  Rule.$retrieve = function(ruleName){
    var rule = window.valkyr.predefinedRules.$find(ruleName)
            || window.valkyr.customRules[ruleName];

    if (!rule) { throw "Rule " + ruleName + " does not exist!"; }

    return rule;
  };

  Rule.build = function(config){
    var newRule = new Rule(config);
    window.valkyr.customRules[config.name] = newRule;
    return newRule;
  };

  Rule.method("$params", function(_){
    return this;
  });

  Rule.method("$getExtraInfo", function(_){
    return this;
  });

  Rule.method("$check", function(fieldName, value){
    var result = {
      isOk: this.$checkWithHierarchy(fieldName, value)
    };

    if (!result.isOk) {
      result.message = this.$$message.replace(/\%s/, fieldName);
    }

    return result;
  });

  Rule.method("$checkWithHierarchy", function(fieldName, value){
    return this.$$inheritanceRule.$check(
      fieldName, value
    ).isOk && this.$$validator(value);
  });

  window.valkyr.Rule = Rule;
})();

(function(){
  function ComparisonRule(config){
    window.valkyr.Rule.call(this, config);
  }

  ComparisonRule.prototype = Object.create(window.valkyr.Rule.prototype);
  ComparisonRule.prototype.constructor = ComparisonRule;

  ComparisonRule.method("$params", function(params){
    this.$$params = params;
    return this;
  });

  ComparisonRule.method("$check", function(fieldName, value){
    var result = { isOk: this.$$validator(value, this.$$comparedTo.value) };
    if (!result.isOk) {
      result.message = this.$$message.replace(/\%s/, fieldName);
      result.message = result.message.replace(/\%s/, this.$$params);
    }

    return result;
  });

  ComparisonRule.method("$getExtraInfo", function(form){
    this.$$comparedTo = form[this.$$params];
    return this;
  });

  window.valkyr.ComparisonRule = ComparisonRule;
})();

(function(){
  function ParameterRule(config){
    window.valkyr.Rule.call(this, config);
  }

  ParameterRule.prototype = Object.create(window.valkyr.Rule.prototype);
  ParameterRule.prototype.constructor = ParameterRule;

  ParameterRule.method("$params", function(params){
    this.$$params = params;
    return this;
  });

  ParameterRule.method("$check", function(fieldName, value){
    var result = { isOk: this.$$validator(value, this.$$params) };
    if (!result.isOk) {
      result.message = this.$$message.replace(/\%s/, fieldName);
      result.message = result.message.replace(/\%s/, this.$$params);
    }

    return result;
  });

  window.valkyr.ParameterRule = ParameterRule;
})();

(function(){
  function Validator(form, constraints){
    if (!form)        { throw "Missing form"; }
    if (!constraints) { throw "Missing constraints"; }
    if (!(constraints instanceof Array)) {
      throw "Constraints must be an array";
    }

    this.$$form = form;
    this.$$constraints = buildConstraints(form, constraints);

    this.errors = {};

    this.$setupSubmission();
  }

  function buildConstraints(form, constraints){
    var newConstraints, i;

    newConstraints = [];

    i = constraints.length;
    while (i--) {
      newConstraints.push(
        new window.valkyr.Constraint(form, constraints[i])
      );
    }

    return newConstraints;
  }

  Validator.method("$setupSubmission", function(){
    this.$$originalSubmit = this.$$form.onsubmit;

    this.$$form.onsubmit = (function(that) {
      return function(event) {
        if (that.isValid()) {
          return (!!that.$$originalSubmit && that.$$originalSubmit(event));
        } else {
          preventSubmission(event);
        }
      };
    })(this);
  });

  function preventSubmission(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    } else if (window.event) {
      // IE uses the global event variable
      window.event.returnValue = false;
    }
  }

  Validator.method("validate", function(field){
    if (field) {
      this.$validateField(field);
    } else {
      this.$validateAllFields();
    }
  });

  Validator.method("$validateField", function(field, constraint){
    var result;

    if (!constraint) {
      constraint = this.$constraintFor(field);
    }

    result = constraint.$validate();

    if (result.errors.length > 0) {
      this.errors[result.name] = result.errors;
    } else {
      delete this.errors[result.name];
    }
  });

  Validator.method("$validateAllFields", function(){
    var i, result;

    this.errors = {};

    i = this.$$constraints.length;

    while (i--) {
      this.$validateField(null, this.$$constraints[i]);
    }
  });

  Validator.method("$constraintFor", function(field){
    var i = this.$$constraints.length;
    while (i--) {
      if (this.$$constraints[i].$$field == field) {
        return this.$$constraints[i];
      }
    }
  });

  Validator.method("isValid", function(){
    var isValid = false;

    this.validate();

    isValid = Object.keys(this.errors).length === 0;

    if (!isValid && this.$$onError) {
      this.$$onError(this.errors);
    }

    return isValid;
  });

  Validator.method("submit", function(options){
    if (!(options && options.skipValidations === true)) {
      if (!this.isValid()) {
        return false;
      }
    }

    if (this.$$originalSubmit) {
      this.$$originalSubmit();
    }
  });

  Validator.method("onError", function(callback){
    this.$$onError = callback;
    return this;
  });

  window.valkyr.Validator = Validator;
})();

(function(){
  var rulesSeparator = "|";

  function Constraint(form, config){
    checkForDuplicateRules(config["rules"].split(rulesSeparator));

    this.$$as    = config["as"];
    this.$$name  = config["name"];

    this.$$field = selectField(form, this.$$name);

    this.$$rules = buildRules(config["rules"], form);
  }

  function checkForDuplicateRules(rules){
    var i, valuesSoFar = {};
    i = rules.length;
    while (i--) {
      var value = rules[i];
      if (Object.prototype.hasOwnProperty.call(valuesSoFar, value)) {
        throw "Duplicate rule declaration!";
      }
      valuesSoFar[value] = true;
    }
  }

  function selectField(form, fieldName){
    return form[fieldName];
  }

  function buildRules(rulesDeclaration, form){
    var i, rulesNames, rules;

    rulesNames = rulesDeclaration.split(rulesSeparator);

    rules = [];

    i = rulesNames.length;
    while (i--) {
      rules.push(
        window.valkyr.Rule.$retrieve(
          rulesNames[i]
        ).$getExtraInfo(form)
      );
    }

    return rules;
  }

  Constraint.method("$validate", function(){
    var i, result, verification;

    result = { name: this.$$name, errors: [] };

    i = this.$$rules.length;
    while (i--) {
      verification = this.$$rules[i].$check(
        this.$$as || this.$$name, this.$value()
      );

      if (!verification.isOk) {
        result.errors.push(verification.message);
      }
    }

    return result;
  });

  Constraint.method("$value", function(){
    if (isCheckbox(this.$$field)) {
      return this.$$field.checked;
    } else if (isRadio(this.$$field)) {
      var i = this.$$field.length;
      while(i--) {
        if (this.$$field[i].checked) {
          return this.$$field[i].value;
        }
      }
    }

    return this.$$field.value;
  });

  function isCheckbox(elm){
    return elm.nodeName === "INPUT" && elm.type === "checkbox";
  }

  function isRadio(elm){
    if (elm instanceof window.NodeList) {
      return elm[0].nodeName === "INPUT" && elm[0].type === "radio";
    }
    return false;
  }

  window.valkyr.Constraint = Constraint;
})();

(function(){
  var rules = {};

  var predefinedRules = {
    $find: function(ruleReference){
      var ruleConfig, rule;

      ruleConfig = parseRuleName(ruleReference);

      if (rule = rules[ruleConfig.name]) {
        rule.$params(ruleConfig.params);
      }

      return rule;
    }
  };

  function parseRuleName(ruleConfig){
    var params = ruleConfig.match(/\[(.+?)\]$/);
    if (params) { params = params[1]; }

    return {
      name: ruleConfig.match(/^.+?(?=\[.+?\])/) || ruleConfig,
      params: params
    };
  }

  window.valkyr.predefinedRules = predefinedRules;

  rules["minLength"] = new window.valkyr.ParameterRule({
    name: "minLength",
    message: "The %s field must be at least %s characters in length.",
    validator: function(value, length){
      return value.length >= length;
    }
  });

  rules["maxLength"] = new window.valkyr.ParameterRule({
    name: "maxLength",
    message: "The %s field must not exceed %s characters in length.",
    validator: function(value, length){
      return value.length <= length;
    }
  });

  rules["exactLength"] = new window.valkyr.ParameterRule({
    name: "exactLength",
    message: "The %s field must be exactly %s characters in length.",
    validator: function(value, length){
      return value.length === length;
    }
  });

  rules["required"] = new window.valkyr.Rule({
    name: "required",
    message: "The %s field can't be empty.",
    validator: function(value){
      if (!value || value === false) { return false; }
      if (value === true) { return true; }
      return value.length > 0;
    }
  });

  rules["email"] = new window.valkyr.Rule({
    name: "emailFormat",
    inherits: "required",
    message: "The %s field must contain a valid email address.",
    validator: function(value){
      return !!value.match(
        /^([0-9a-zA-Z]([-\.\w]*[0-9a-zA-Z])*@([0-9a-zA-Z][-\w]*[0-9a-zA-Z]\.)+[a-zA-Z]{2,9})$/
      );
    }
  });

  rules["url"] = new window.valkyr.Rule({
    name: "url",
    inherits: "required",
    message: "The %s field must contain a valid URL.",
    validator: function(value){
      return !!value.match(
        /^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/
      );
    }
  });

  rules["numeric"] = new window.valkyr.Rule({
    name: "number",
    message: "The %s field must be a number.",
    validator: function(value){
      return !isNaN(parseFloat(value)) && isFinite(value);
    }
  });

  rules["integer"] = new window.valkyr.Rule({
    name: "integer",
    inherits: "numeric",
    message: "The %s field must contain an integer.",
    validator: function(value){
      return !!value.match(/^\-?[0-9]+$/);
    }
  });

  rules["decimal"] = new window.valkyr.Rule({
    name: "decimal",
    inherits: "numeric",
    message: "The %s field must contain a decimal number.",
    validator: function(value){
      return !!value.match(/^\-?[0-9]*\.[0-9]+$/);
    }
  });

  rules["natural"] = new window.valkyr.Rule({
    name: "natural",
    inherits: "numeric",
    message: "The %s field must contain only positive numbers.",
    validator: function(value){
      return !!value.match(/^[0-9]+$/i);
    }
  });

  rules["alphabetical"] = new window.valkyr.Rule({
    name: "alphabetical",
    inherits: "required",
    message: "The %s field must only contain alphabetical characters.",
    validator: function(value){
      return !!value.match(/^[a-z]+$/i);
    }
  });

  rules["equals"] = new window.valkyr.ComparisonRule({
    name: "equals",
    inherits: "required",
    message: "The %s field needs to be equal to %s field.",
    validator: function(value, comparedTo){
      return value === comparedTo;
    }
  });

  rules["credit-card"] = new window.valkyr.Rule({
    name: "creditCardNumber",
    inherits: "required",
    message: "The %s field doesn't have a valid credit-card number.",
    validator: function(number){
      var len, mul, prodArr, sum;

      len = number.length;
      mul = 0;
      prodArr = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 2, 4, 6, 8, 1, 3, 5, 7, 9]];
      sum = 0;

      while (len--) {
        sum += prodArr[mul][parseInt(number.charAt(len), 10)];
        mul ^= 1;
      }

      return sum % 10 === 0 && sum > 0;
    }
  });

  rules["ip"] = new window.valkyr.Rule({
    name: "IP",
    inherits: "required",
    message: "The %s field must contain a valid IP.",
    validator: function(ip){
      return !!ip.match(/^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i);
    }
  });
})();

(function(){
  window.Validator = window.valkyr.Validator;
})();
