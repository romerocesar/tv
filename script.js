  angular.module('plnkr', [])
    .directive('tvSize', function($log) {
      // dimensions that this directive computes programmatically
      var _dimensions = ['height', 'width', 'diagonal']; // no shape yet.
      // supported units and their conversion to and from cm.
      var _units = {
          'in': {to: 2.54, from: 1/2.54},
          'cm': {to: 1, from:1}
          // add more units here if desired (e.g. 'm': {to:100, from:.001})
      };
      // calculates the height of the screen using the given params. For now,
      // assumes dimensions contains the shape and width.
      var height = function(dimensions) {
        $log.debug('calculating height with input: ' + angular.toJson(dimensions));
        var d = dimensions && dimensions.diagonal,
          w = dimensions && dimensions.width,
          s = dimensions && dimensions.shape;
        if (w && s) {
          dimensions.height = w * s.H / s.W;
        } else if (d && w) {
          dimensions.height = Math.sqrt(d * d + w * w);
        } else if (d && s) {
          var r = s.W / s.H; // ratio
          dimensions.height = Math.sqrt(d * d / (r * r + 1));
        } else if (!dimensions.height) {
          $log.error('cannot compute the height from dimensions: ' + angular.toJson(dimensions));
          return;
        }
        $log.info('calculated: ' + dimensions.height);
        return dimensions.height;
      };
      // calculates the width of the screen starting from the given dimensions.
      var width = function(dimensions) {
        $log.debug('calculating width using: ' + angular.toJson(dimensions));
        var h = dimensions && dimensions.height,
          s = dimensions && dimensions.shape;
        if (h && s) {
          dimensions.width = h * s.W / s.H;
        } else {
          $log.error('cannot compute the width from dimensions: ' + angular.toJson(dimensions));
        }
        $log.info('calculated width: ' + dimensions.width);
        return dimensions.width;
      };
      // calculate the diagonal from the given dimensions. Assumes dimensions contains width and height.
      var diagonal = function(dimensions) {
        $log.debug('calculating diagonal with input: ' + angular.toJson(dimensions));
        var h = dimensions && dimensions.height,
          w = dimensions && dimensions.width;
        if (h && w) {
          dimensions.diagonal = Math.sqrt(h * h + w * w);
        } else {
          $log.error('cannot compute the diagonal from dimensions: ' + angular.toJson(dimensions));
        }
        $log.info('calculated: ' + dimensions.diagonal);
        return dimensions.diagonal;
      };
      // calculates the shape of the screen from the given dimensions. Asummes
      // dimensions contains the shape for now.
      var shape = function(dimensions) {
        $log.debug('calculating shape using: ' + angular.toJson(dimensions));
        $log.info('calculated shape as : ' + angular.toJson(dimensions.shape));
        return dimensions.shape;
      };
      // D3 chart begins here
      var _height = 500,
        _width = 500,
        _svg, _data = [];

      function render() {
        if (!_svg) {
          _svg = d3.select('#chart').append('svg')
            .attr('height', _height)
            .attr('width', _width);
        }
        renderScreen(_svg);
      }

      function renderScreen(svg) {
        // enter
        svg.selectAll('.screen')
          .data(_data)
          .enter()
          .append('g')
          .append('rect')
          .classed('screen', true)
          .style('fill', 'gray')
          .style('stroke', 'black')
          .style('stroke-width', 3);
        // update
        svg.selectAll('.screen')
          .data(_data)
          .transition().duration(500)
          .attr('width', function(datum) {
            return datum.width;
          }).attr('height', function(datum) {
            return datum.height;
          });
      }
      // converts all _dimensions found in src multiplying them by rate
      // and returns the result in a new object.
      function convert(src, rate) {
            $log.debug('convert(src, rate): ', src, rate);
            var ans = {};
            angular.forEach(_dimensions, function(d) {
              ans[d] = src[d] * rate;
            });
            $log.info('dimensions converted to: ' + angular.toJson(ans));
            return ans;
      }
      return {
        link: function(scope, elem, attrs, ctrl) {
          // recalculate all dimensions given a new dimension and its unit
          scope.resize = function(value, unit) {
            var _unit = unit || 'cm'; // default to cm
            $log.debug('resizing the TV starting from: ', value, _unit);
            var tv = value;
            tv[scope.fixed] = scope.tv[scope.fixed];
            if (Object.keys(tv).length < 2) {
              $log.error('insufficient data to resize the TV: ' + angular.toJson(tv));
              return;
            }
            // compute missing dimensions
            height(tv);
            width(tv);
            diagonal(tv);
            shape(tv);
            // convert units and copy the new values to the model.
            angular.forEach(_units, function(value, key) {
              if(_unit == key) {
                // don't convert the input unit to reduce rounding errors.
                scope.tv[key] = tv;
              } else {
                var cm = convert(tv, _units[_unit].to);
                scope.tv[key] = convert(cm, value.from);
              }
            });
            _data = [scope.tv.cm]; // always chart cm for now.
            render();
            $log.info('resized: ' + angular.toJson(scope.tv));
          };
          // expose units and dimensions to dynamically generate the form
          scope.dimensions = _dimensions;
          scope.units = _units;
          // start with a 55" TV
          scope.tv = {
            shape: {
              W: 16,
              H: 9
            },
            in : {
              diagonal: 55,
            }
          };
          scope.fixed = 'shape'; // which dimension will remain constant.
          scope.resize(scope.tv['in'], 'in');
          $log.info('initialized directive with TV: ' + angular.toJson(scope.tv));
        },
        restrict: 'E',
        templateUrl: 'tv-size.html',
        scope: true,
      };
    });
