window.__STROKE_STREAM__ = [];
(() => {
  const ctx = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const context = ctx.call(this, type, ...args);
    if (type === '2d') {
      const origStroke = context.stroke;
      const origBeginPath = context.beginPath;
      const origMoveTo = context.moveTo;
      const origLineTo = context.lineTo;
      const origBezier = context.bezierCurveTo;

      let currentPath = [];

      context.beginPath = function() {
        currentPath = [];
        return origBeginPath.apply(this, arguments);
      };

      context.moveTo = function(x, y) {
        currentPath.push({ action: 'move', x, y });
        return origMoveTo.apply(this, arguments);
      };

      context.lineTo = function(x, y) {
        currentPath.push({ action: 'line', x, y });
        return origLineTo.apply(this, arguments);
      };

      context.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
        currentPath.push({ action: 'bezier', cp1x, cp1y, cp2x, cp2y, x, y });
        return origBezier.apply(this, arguments);
      };

      context.stroke = function() {
        window.__STROKE_STREAM__.push({
          timestamp: performance.now(),
          strokeStyle: context.strokeStyle,
          lineWidth: context.lineWidth,
          points: [...currentPath]
        });
        return origStroke.apply(this, arguments);
      };
    }
    return context;
  };
})();
