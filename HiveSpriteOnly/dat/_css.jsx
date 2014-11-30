var take = require('../lib/take');
var _    = require('../lib/underscore');

var CSS = take({
  init: function ($) {
    this.bindCtrls($);
    this.initView();
    return this;
  },

  getData: function () {
    return {
      cssFormat         : this.ddlCSSFormat.selection.text,
      selectorPrefix    : this.txtSelectorPrefix.text,
      classPrefix       : this.txtClassPrefix.text,
      selectorSuffix    : this.txtSelectorSuffix.text,
      includeWidthHeight: this.chkIncludeWidthHeight.value
    };
  },

  initView: function () {
    var CSSFormat = this.CSSFormat = { 'Expanded': 0, 'Compact': 1 };

    // initialize dropdownlist `CSS Format`
    _.each(CSSFormat, function (index, text) {
      this.ddlCSSFormat.add('item', text);
    }, this);

    // `CSS Format` default to `Expanded`
    this.ddlCSSFormat.selection = 0;

    this.txtSelectorPrefix.text = '';
    this.txtClassPrefix.text = 'sp-';
    this.txtSelectorSuffix.text = '';
    this.chkIncludeWidthHeight.value = true;
  },

  bindCtrls: function ($) {
    _.each([
      'ddlCSSFormat',
      'txtSelectorPrefix',
      'txtClassPrefix',
      'txtSelectorSuffix',
      'chkIncludeWidthHeight'
    ], function (name) {
      this[name] = $(name);
    }, this);
  }
});

module.exports = function ($) {
  return (new CSS).init($);
};
