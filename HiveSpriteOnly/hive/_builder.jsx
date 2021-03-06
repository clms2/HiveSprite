var constants    = require('../config/constants');
var take         = require('../lib/take');
var util         = require('../lib/util');
var _            = require('../lib/underscore');
var pack         = require('../divs/pack');

var BuildMethods = constants.BuildMethods;
var ArrangeBy    = constants.ArrangeBy;
var CSSFormats   = constants.CSSFormats;

var Builder = take({
  constructor: function ($) {
    this.pack = pack($);
  },

  build: function () {
    _.compose(
      _.bind(this.buildCss, this),
      util.defaultPixels(_.bind(this.buildSprite, this))
    )();
  },

  buildSprite: function () {
    var settings = this.pack.getData();
    // util.inspect(settings);

    // generate a fresh default document
    var doc = util.newDocument();

    var layersInfo = this.populateImagesToLayers(settings, doc);
    // util.inspect(layersInfo);

    var buildFunc = (function () {
      switch (settings.buildMethod) {
      case BuildMethods.HORIZONTAL: return _.bind(this.buildHorizontalSprite, this);
      case BuildMethods.VERTICAL  : return _.bind(this.buildVerticalSprite, this);
      case BuildMethods.TILED     : return _.bind(this.buildTiledSprite, this);
      }
    }).call(this);

    layersInfo = buildFunc(settings, layersInfo);
    // util.inspect(layersInfo);

    // tidy up document
    doc.revealAll();
    doc.trim(TrimType.TRANSPARENT);
    util.viewDocumentInActualSize();

    // export generated document as PNG file
    if (settings.exportSpriteImage) {
      util.exportAsPNG(doc, settings.outputFolder);
    }

    // close document if necessary
    if (settings.closeGeneratedDocument) {
      doc.close(SaveOptions.DONOTSAVECHANGES);
    }

    // open output folder if necessary
    if (settings.openOutputFolder) {
      new Folder(settings.outputFolder).execute();
    }

    var pickWhiteList = [
      'exportCSSFile',
      'outputFolder',
      'cssFormat',
      'includeWidthHeight'
    ];

    // provide result info to outside
    var result = _.extend({
      'cssInfo': layersInfo
    }, _.pick(settings, pickWhiteList));

    // util.inspect(result);
    return result;
  },

  populateImagesToLayers: function (settings, doc) {
    var imagePaths = _(settings.sourceImages).pluck('path');

    // set doc as active document for safety
    app.activeDocuement = doc;

    // place selected images into each layer
    util.newLayersFromFiles(imagePaths.reverse());

    var layers = _.toArray(doc.layers);

    // remove the last empty layer
    layers.pop().remove();

    // obtain each layer's basic info
    return _.map(layers, function (layer) {
      var bounds = _.map(layer.bounds, Number);

      return {
        'layer' : layer,
        'name'  : layer.name.replace(/\s+/g, ''),
        'width' : bounds[2] - bounds[0],
        'height': bounds[3] - bounds[1]
      };
    });
  },

  buildHorizontalSprite: function (settings, layersInfo) {
    return this.buildSoloSprite(settings, layersInfo, function (memoOffset, item, index) {
      item['background-position'] = (-memoOffset) + (memoOffset === 0 ? '' : 'px') + ' 0';

      // translate each layer from left to right
      item.layer.translate(memoOffset, 0);
      return (memoOffset += item.width);
    });
  },

  buildVerticalSprite: function (settings, layersInfo) {
    return this.buildSoloSprite(settings, layersInfo, function (memoOffset, item, index) {
      item['background-position'] = '0 ' + (-memoOffset) + (memoOffset === 0 ? '' : 'px');

      // translate layer from top to bottom
      item.layer.translate(0, memoOffset);
      return (memoOffset += item.height);
    });
  },

  buildSoloSprite: function (settings, layersInfo, involver) {
    var offsetSpacing  = settings.offsetSpacing;
    var selectorPrefix = settings.selectorPrefix;
    var classPrefix    = settings.classPrefix;
    var selectorSuffix = settings.selectorSuffix;

    _.reduce(layersInfo, function (memoOffset, item, index) {
      memoOffset    = involver(memoOffset, item, index);

      item.selector = selectorPrefix + '.' + classPrefix + item.name + selectorSuffix;
      item.width    = item.width + 'px';
      item.height   = item.height + 'px';

      delete item.layer;
      delete item.name;

      return (memoOffset += offsetSpacing);
    }, 0);

    return layersInfo;
  },

  buildTiledSprite: function (settings, layersInfo) {
    var offsetSpacing     = settings.offsetSpacing;
    var selectorPrefix    = settings.selectorPrefix;
    var classPrefix       = settings.classPrefix;
    var selectorSuffix    = settings.selectorSuffix;
    var horizontalSpacing = settings.horizontalSpacing;
    var verticalSpacing   = settings.verticalSpacing;
    var rowNums           = settings.rowNums;

    var maxWidth  = _.chain(layersInfo).pluck('width').max().value();
    var maxHeight = _.chain(layersInfo).pluck('height').max().value();
    // util.inspect({ max_width: maxWidth, max_height: maxHeight });

    _.reduce(layersInfo, function (offset, item, index) {
      var x = offset.x;
      var y = offset.y;

      item['background-position'] = [
        -x + (x === 0 ? '' : 'px'),
        -y + (y === 0 ? '' : 'px')
      ].join(' ');

      // position layer according to offset
      item.layer.translate(x, y);

      item.selector = selectorPrefix + '.' + classPrefix + item.name + selectorSuffix;
      item.width    = item.width + 'px';
      item.height   = item.height + 'px';

      delete item.layer;
      delete item.name;

      switch (settings.arrangeBy) {
      case ArrangeBy.ROWS:
        if (index % rowNums === rowNums - 1) {
          offset.y += (maxHeight + verticalSpacing);
          offset.x = 0;
        } else {
          offset.x += (maxWidth + horizontalSpacing);
        }
        break;
      case ArrangeBy.COLUMNS:
        if (index % rowNums === rowNums - 1) {
          offset.x += (maxWidth + horizontalSpacing);
          offset.y = 0;
        } else {
          offset.y += (maxHeight + verticalSpacing);
        }
        break;
      }

      return offset;
    }, { x: 0, y: 0 });

    return layersInfo;
  },

  buildCss: function (settings) {
    // util.inspect(settings);

    if (!settings.exportCSSFile) {
      return;
    }

    var tmplCss = this.getCssTemplate(
      settings.cssFormat,
      settings.includeWidthHeight
    );

    var compiled = _.partial(util.vsub, tmplCss);
    var contents = _.map(settings.cssInfo, compiled).join('\n');
    // alert(contents);

    // save generated CSS to text file
    util.saveAsTextFile(contents, settings.outputFolder);
  },

  getCssTemplate: function (cssFormat, includeWidthHeight) {
    switch (cssFormat) {
    case CSSFormats.EXPANDED: return this.expandedCssTemplate(includeWidthHeight);
    case CSSFormats.COMPACT : return this.compactCssTemplate(includeWidthHeight);
    }
  },

  expandedCssTemplate: function (includeWidthHeight) {
    var ret = '${selector} {\n';
    includeWidthHeight && (ret += '\twidth: ${width};\n\theight: ${height};\n');
    ret += '\tbackground-position: ${background-position};\n';
    return (ret += '}\n');
  },

  compactCssTemplate: function (includeWidthHeight) {
    var ret = '${selector} {';
    includeWidthHeight && (ret += ' width: ${width}; height: ${height};');
    return (ret += ' background-position: ${background-position}; }');
  }
});

module.exports = Builder;
