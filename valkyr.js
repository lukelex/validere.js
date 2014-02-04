// ==========================================================================
// Project:   Valkyr.js - JavaScript Separation Of Concerns
// Copyright: Copyright 2014 Lukas Alexandre
// License:   Licensed under MIT license
//            See https://github.com/lukelex/valkyr.js/blob/master/LICENSE
// ==========================================================================

// Version: 0.1.0 | From: 04-02-2014

window.valkyr = {};

(function(){
  function Rule(config){
    this.$$name      = config.name;
    this.$$message   = config.message;
    this.$$validator = config.validator;
  }

  Rule.$build = function(ruleName, newRuleConfig){
    var existingRule = window.valkyr.predefinedRules[ruleName];

    if (existingRule) {
      return existingRule;
    } else {
      return new window.valkyr.CustomRule(newRuleConfig);
    }
  };

  Rule.prototype.$check = function(fieldName, value){
    var result = { isOk: this.$$validator(value) };
    if (!result.isOk) {
      result.message = this.$$message.replace(/\%s/, fieldName);
    }

    return result;
  };

  window.valkyr.Rule = Rule;
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

    this.$$setupSubmission();
  }

  function buildConstraints(form, constraints){
    var newConstraints, i;

    newConstraints = [];

    i = constraints.length;
    while (i--) {
      newConstraints.push(
        new window.valkyr.Constraint(
          selectField(form, constraints[i].name),
          constraints[i]
        )
      );
    }

    return newConstraints;
  }

  function selectField(form, fieldName){
    return form.querySelector(
      "input[name=\"" + fieldName + "\"]"
    );
  }

  Validator.prototype.$$setupSubmission = function(){
    this.$$originalSubmit = this.$$form.onsubmit;
    this.$$form.addEventListener("submit", function(){
      if (this.$$validate()) {
        this.$$originalSubmit();
      }
    });
  };

  Validator.prototype.validate = function(){
    var i, result;

    i = this.$$constraints.length;

    while (i--) {
      result = this.$$constraints[i].$validate();
      this.errors[result.name] = result.errors;
    }

    return true;
  };

  Validator.prototype.isValid = function(){
    this.validate();
    return Object.keys(this.errors).length === 0;
  };

  Validator.prototype.submit = function(options){
    // if (options && options.skipValidations !== true) {
      if (!this.isValid()) {
        return false;
      }
    // }

    if (this.$$originalSubmit) {
      this.$$originalSubmit();
    }
  };

  Validator.prototype.whenValid = function(){};
  Validator.prototype.whenInvalid = function(callback){
    callback(this.$$errors);
  };

  window.valkyr.Validator = Validator;
})();

(function(){
  function Constraint(field, config){
    this.$$field   = field;
    this.$$name    = config["name"];
    this.$$display = config["display"];

    this.$$rules   = buildRules(config["rules"]);
  }

  function buildRules(rulesDeclaration){
    var i, rulesNames, rules;

    rulesNames = rulesDeclaration.split("|");

    rules = [];

    i = rulesNames.length;
    while (i--) {
      rules.push(
        window.valkyr.Rule.$build(rulesNames[i])
      );
    }

    return rules;
  }

  Constraint.prototype.$validate = function(){
    var i, result;

    result = { name: this.$$name, errors: [] };

    i = this.$$rules.length;
    while (i--) {
      verification = this.$$rules[i].$check(
        this.$$name, this.$$field.value
      );

      if (!verification.isOk) {
        result.errors.push(verification.message);
      }
    }

    return result;
  };

  window.valkyr.Constraint = Constraint;
})();

(function(){
  function CustomRule(config){
    if (!config) { throw "Rule configuration can't be empty"; }

    this.$$name      = config.name;
    this.$$message   = config.message;
    this.$$validator = config.validator;
  }

  CustomRule.prototype.$check = function(value){
    var result = { isOk: this.$$validator(value) };
    if (!result.isOk) {
      result.message = this.$$message.replace(/\%s/, fieldName);
    }

    return result;
  };

  window.valkyr.CustomRule = CustomRule;
})();

(function(){
  var predefinedRules = {};

  predefinedRules["presence"] = new window.valkyr.Rule({
    name: "presence",
    message: "The %s field can't be empty.",
    validator: function(value){
      if (!value) { return false; }
      return value.length > 0;
    }
  });

  predefinedRules["email"] = new window.valkyr.Rule({
    name: "emailFormat",
    message: "The %s field must contain a valid email address.",
    validator: function(value){
      return searchText.match(
        /^[a-zA-Z0-9.!#$%&amp;'*+\-\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/
      );
    }
  });

  window.valkyr.predefinedRules = predefinedRules;
})();
