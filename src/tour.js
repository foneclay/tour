'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cashDom = require('cash-dom');

var _cashDom2 = _interopRequireDefault(_cashDom);

var _TinyAnimate = require('TinyAnimate');

var _TinyAnimate2 = _interopRequireDefault(_TinyAnimate);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var defaults = {
  maskVisible: true,
  maskVisibleOnNoTarget: false,
  maskClickThrough: false,
  canExit: false,
  maskScrollThrough: true,
  maskColor: 'rgba(0,0,0,.3)',
  dark: false,
  scrollBox: navigator.userAgent.indexOf('AppleWebKit') != -1 ? "body" : "html",
  previousText: 'Previous',
  nextText: 'Next',
  finishText: 'Finish',
  animationDuration: 400,
  placement: ['bottom', 'right', 'top', 'left'],
  disableHotkeys: false,
  showPrevious: true,
  showNext: true,
  padding: 5,
  maxHeight: 120,
  maxWidth: 250,
  play: true
};

// Reference to all of our elements and uiState that we'll add to in a bit
var els = {};

// Reference to all of our dimensions
var dims = {};

var errors = {
  notFound: {
    error: 'not_found',
    message: 'Step could not be found.'
  },
  interrupted: {
    error: 'interrupted',
    message: 'The tour was interrupted'
  }
};

// Some utilities for events that we'll resolve in a bit
var eventUtils = {
  onWindowScrollDebounced: throttle(onWindowScroll, 16)
};

// The exported API
var service = {
  current: null,
  //
  play: play,
  start: start,
  stop: stop,
  next: next,
  previous: previous,
  goto: goto
};

var initialized = void 0;

exports.default = service;

// ########################################################################
// API & State
// ########################################################################


function start(tour, videoUrl) {

  if (!initialized) {
    init();
    initialized = true;
  }

  if (!tour) {
    return Promise.reject('No Tour Specified!');
  }

  if (!tour.steps.length) {
    return Promise.reject('No steps were found in that tour!');
  }

  if (service.current) {
    stop();
    return start(tour);
  }

  var d = void 0,
      resolve = void 0,
      reject = void 0;
  d = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });

  service.current = Object.assign({}, defaults, tour, {
    index: 0,
    promise: d,
    resolve: resolve,
    reject: reject
  });

  if (service.current.play) {
    var button = document.createElement("button");
    button.id = "play-button";
    button.value = "";
    button.innerText = "Play Video";
    document.querySelector('#Tour').appendChild(button);
    play(videoUrl)
  } else {
    if(document.querySelector("#play-button")) 
        document.querySelector("#play-button").remove();
  }

  prepView();
  updateView();

  return service.current.promise;
}

function play(videoUrl) {
    if (videoUrl !== event) {
      document.querySelector('#play-button').value = videoUrl;
      return;
    }
    if (document.querySelector('#tutorialVideo'))
        document.querySelector('#tutorialVideo').remove();
    if (document.querySelector('#play-button').innerText === 'Close Video'){
        document.querySelector('#play-button').innerText = "Play Video"
        videoUrl.preventDefault(videoUrl);
        return;
    }
    videoUrl.preventDefault(videoUrl);
    var div = document.createElement("div")
    div.id = "tutorialVideo";
    var x = document.createElement("iframe")
    x.id = "video-iframe";
    x.src = document.querySelector('#play-button').value;
    document.querySelector('#Tour').appendChild(div).appendChild(x);;
    document.querySelector('#play-button').innerText = "Close Video"
    return;
}

function stop() {
  cleanup();
  service.current.reject(errors.interrupted);
  service.current = null;
  if(document.querySelector("#play-button")) 
      document.querySelector("#play-button").remove();
}

function next() {
  if (!stepExists(service.current.index + 1)) {
    return finish();
  }
  return doAfter(service.current.index).then(function () {
    service.current.index++;
  }).then(function (res) {
    // Finish
    if (service.current.index === service.current.steps.length) {
      return Promise.resolve(true);
    }
    return doBefore(service.current.index);
  }).then(function (res) {
    // Finish things out
    if (res === true) {
      return doAfter(service.current.index).then(function (res) {
        return finish();
      });
    }
    updateView();
  });
}

function previous() {
  if (!stepExists(service.current.index - 1)) {
    return;
  }
  return doAfterPrev(service.current.index).then(function (res) {
    service.current.index--;
    return doBefore(service.current.index);
  }).then(function (res) {
    updateView();
  });
}

function goto(i) {
  if (!stepExists(i)) {
    return Promise.reject(errors.notFound);
  }
  return doAfter(service.current.index).then(function (res) {
    service.current.index = i;
    return doBefore(service.current.index);
  }).then(function (res) {
    updateView();
  });
}

// ########################################################################
// Internals
// ########################################################################

function init() {
  injectTemplate();
  resolveEventSystem();
}

function prepView() {

  var current = service.current;

  // Check for valid placement default
  if (!validPriorities(service.current.placement)) {
    console.warn('Tour - Invalid placement setting found in tour config. Must be an array eg: [\'bottom\', \'right\', \'top\', \'left\']', service.current);
    service.current.placement = defaults.placement;
  }
  // Check for valid step placement
  service.current.steps.forEach(function (step) {
    if (!step.placement) {
      return;
    }
    if (!validPriorities(step.placement)) {
      console.warn('Tour - Invalid placement setting found in step. Must be an array eg: [\'bottom\', \'right\', \'top\', \'left\']', step);
    }
  });

  Object.assign(els, {
    window: (0, _cashDom2.default)(window),
    tour: (0, _cashDom2.default)('#Tour'),
    wrap: (0, _cashDom2.default)('#Tour-box-wrap'),
    box: (0, _cashDom2.default)('#Tour-box'),
    tip: (0, _cashDom2.default)('#Tour-tip'),
    step: (0, _cashDom2.default)('#Tour-step'),
    length: (0, _cashDom2.default)('#Tour-length'),
    close: (0, _cashDom2.default)('#Tour-close'),
    content: (0, _cashDom2.default)('#Tour-content'),
    innerContent: (0, _cashDom2.default)('#Tour-inner-content'),
    actions: (0, _cashDom2.default)('#Tour-actions'),
    previous: (0, _cashDom2.default)('#Tour-previous'),
    next: (0, _cashDom2.default)('#Tour-next'),
    masks_wrap: (0, _cashDom2.default)('#Tour-masks'),
    masks_top: (0, _cashDom2.default)('#Tour-masks .top'),
    masks_right: (0, _cashDom2.default)('#Tour-masks .right'),
    masks_bottom: (0, _cashDom2.default)('#Tour-masks .bottom'),
    masks_left: (0, _cashDom2.default)('#Tour-masks .left'),
    masks_center: (0, _cashDom2.default)('#Tour-masks .center'),
    canvas: (0, _cashDom2.default)('#Tour-canvas'),
    ctx: (0, _cashDom2.default)('#Tour-canvas')[0].getContext("2d"),
    scroll: (0, _cashDom2.default)(current.scrollBox),
    target: false,
    play : (0, _cashDom2.default)('#play-button')
  });

  Object.assign(dims, {
    window: {},
    scroll: {},
    target: {},
    canvas: {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    }
  });

  // Events
  if (!current.disableHotkeys) {
    els.previous.on('click', previous);
    els.next.on('click', next);
    els.close.on('click', clickStop);
    els.play.on('click', play);


    els.window.on('keydown', keyDown);
    els.window.on('resize', eventUtils.onWindowScrollDebounced);
    els.window.on('scroll', eventUtils.onWindowScrollDebounced);
    eventUtils.addWheelListener(window, eventUtils.onWindowScrollDebounced);
    els.content.on('scroll', onBoxScroll);
    eventUtils.addWheelListener(els.content[0], onBoxScroll);
    if (current.maskScrollThrough === false) {
      eventUtils.addWheelListener(els.masks_wrap[0], stopMaskScroll);
    }
  }

  // Show the element
  els.tour.removeClass('hidden');
}

function doBefore(i) {
  if (!service.current.steps[i]) {
    return Promise.resolve();
  }
  if (service.current.steps[i].before) {
    return service.current.steps[i].before();
  }
  return Promise.resolve();
}

// this does the istructions after the user pushed the 'next' button
function doAfter(i) {
  if (!service.current.steps[i]) {
    return Promise.resolve();
  }
  if (service.current.steps[i].after) {
    return service.current.steps[i].after();
  }
  return Promise.resolve();
}

// this does the istructions after the user pushed the 'prev' button
function doAfterPrev(i) {
  if (!service.current.steps[i]) {
    return Promise.resolve();
  }
  if (service.current.steps[i].prev) {
    return service.current.steps[i].prev();
  }
  return Promise.resolve();
}

function finish() {
  cleanup();
  service.current.resolve();
  service.current = null;
  if(document.querySelector("#play-button")) 
      document.querySelector("#play-button").remove();
}

function cleanup() {
  // Hide the tour element
  els.tour.addClass('hidden');

  els.canvas.css('opacity', null);

  els.masks_wrap.css('pointer-events', null);

  els.previous.off('click', previous);
  els.next.off('click', next);
  els.close.off('click', clickStop);

  els.window.off('keydown', keyDown);
  els.window.off('resize', eventUtils.onWindowScrollDebounced);
  els.window.off('scroll', eventUtils.onWindowScrollDebounced);
  eventUtils.removeWheelListener(window, eventUtils.onWindowScrollDebounced);
  els.content.off('scroll', onBoxScroll);
  eventUtils.removeWheelListener(els.content[0], onBoxScroll);
  if (service.current.maskScrollThrough === false) {
    eventUtils.removeWheelListener(els.masks_wrap[0], stopMaskScroll);
  }
}

function updateView() {

  var current = service.current;
  var steps = current.steps;
  var index = current.index;
  var currentStep = steps[index];

  // Mask Events?
  els.masks_wrap.css('pointer-events', (currentStep.maskClickThrough !== undefined ? currentStep.maskClickThrough : current.maskClickThrough) ? 'none' : 'all');

  // Dark Box?
  if (currentStep.dark !== undefined ? currentStep.dark : current.dark) {
    els.box.addClass('dark-box');
  } else {
    els.box.removeClass('dark-box');
  }

  // This adds #steps.length pager dots
 if(document.querySelector('#pager-dot'))
       document.querySelector('#pager-dot').remove();
 var prev = document.createElement('div');
 prev.id = "pager-dot";
 document.querySelector('#Tour-actions').insertBefore(prev,document.querySelector('#Tour-next'))
 var next = document.createElement("div");
 for(var i=0; i< steps.length; i++){
   var next = document.createElement("div");
     if (i===index)
         next.id = "Tour-step"
     else 
         next.id = "Tour-length" 
      prev.appendChild(next)   
 }  

  // HTML updates
  //els.step.html(index + 1)
  //els.length.html(steps.length)
  els.innerContent.html(currentStep.content);
  els.previous.html(currentStep.previousText || current.previousText);
  els.next.html(currentStep.nextText || (index == steps.length - 1 ? current.finishText : current.nextText));

  if (currentStep.showNext === undefined ? current.showNext : currentStep.showNext) {
    els.next.css({ display: null });
  } else {
    els.next.css({ display: 'none' });
  }

  if (index > 0 && (currentStep.showPrevious === undefined ? current.showPrevious : currentStep.showPrevious)) {
    els.previous.css({ display: null });
  } else {
    els.previous.css({ display: 'none' });
  }

  if (currentStep.canExit === undefined ? current.canExit : currentStep.canExit) {
    els.close.css({ display: null });
  } else {
    els.close.css({ display: 'none' });
  }

  // Scroll the content box back to the top
  els.content[0].scrollTop = 0;

  findTarget();
  getDimensions();
  return scrollToTarget().then(function () {
    getDimensions();
    !dims.first && (dims.first = true) && moveToTarget();
    return moveToTarget();
  });
}

function findTarget() {
  var target = (0, _cashDom2.default)(service.current.steps[service.current.index].target);
  els.target = target.length ? target : null;
}

function getDimensions() {

  var current = service.current;

  if (!current) {
    return;
  }

  // Window
  dims.window = {
    width: els.window[0].innerWidth,
    height: els.window[0].innerHeight
  };

  // Scrollbox
  dims.scroll = {
    width: els.scroll.outerWidth(),
    height: els.scroll.outerHeight(),
    offset: els.scroll.offset(),
    scrollTop: els.scroll[0].scrollTop,
    scrollLeft: els.scroll[0].scrollLeft
  };

  // Round Offsets
  Object.keys(dims.scroll.offset).forEach(function (key) {
    dims.scroll.offset[key] = Math.ceil(dims.scroll.offset[key]);
  });

  dims.scroll.height = dims.scroll.height + dims.scroll.offset.top > dims.window.height ? dims.window.height : dims.scroll.height;
  dims.scroll.width = dims.scroll.width + dims.scroll.offset.left > dims.window.width ? dims.window.width : dims.scroll.width;
  dims.scroll.offset.toBottom = dims.scroll.height + dims.scroll.offset.top;
  dims.scroll.offset.toRight = dims.scroll.width + dims.scroll.offset.left;
  dims.scroll.offset.fromBottom = dims.window.height - dims.scroll.offset.top - dims.scroll.height;
  dims.scroll.offset.fromRight = dims.window.width - dims.scroll.offset.left - dims.scroll.width;

  // Target
  dims.target = {
    width: els.target.outerWidth(),
    height: els.target.outerHeight(),
    offset: els.target.offset()
  };

  // For an html/body scrollbox
  if (current.scrollBox == 'body' || current.scrollBox == 'html') {
    dims.target.offset.top -= dims.scroll.scrollTop;
  }

  // Round Offsets
  Object.keys(dims.target.offset).forEach(function (key) {
    dims.target.offset[key] = Math.ceil(dims.target.offset[key]);
  });

  // Get Target Bottom and right
  dims.target.offset.toBottom = dims.target.offset.top + dims.target.height;
  dims.target.offset.toRight = dims.target.offset.left + dims.target.width;
  dims.target.offset.fromBottom = dims.window.height - dims.target.offset.top - dims.target.height;
  dims.target.offset.fromRight = dims.window.width - dims.target.offset.left - dims.target.width;

  // Get Target Margin Points
  dims.target.margins = {
    offset: {
      top: dims.target.offset.top - current.padding,
      left: dims.target.offset.left - current.padding,
      toBottom: dims.target.offset.toBottom + current.padding,
      toRight: dims.target.offset.toRight + current.padding,
      fromBottom: dims.target.offset.fromBottom - current.padding,
      fromRight: dims.target.offset.fromRight - current.padding
    },
    height: dims.target.height + current.padding * 2,
    right: dims.target.offset.fromRight + current.padding * 2
  };
}

function scrollToTarget() {
  els.seeking = true;
  var newScrollTop = findScrollTop();
  return new Promise(function (resolve, reject) {
    if (!newScrollTop) {
      resolve();
      els.seeking = false;
    } else {
      _TinyAnimate2.default.animate(els.scroll[0].scrollTop, newScrollTop, service.current.animationDuration, function (d) {
        els.scroll[0].scrollTop = d;
      }, 'ease', function () { // easeOutQuad removed to fix bug for the iOS animation
        els.seeking = false;
        resolve();
      });
    }
  });
}

function findScrollTop() {

  var maxHeight = service.current.maxHeight;

  // Is element to large to fit?
  if (dims.target.margins.height > dims.scroll.height) {
    // Is the element too far above us?
    if (dims.target.offset.toBottom - maxHeight < dims.scroll.offset.top) {
      return dims.scroll.scrollTop - (dims.scroll.offset.top - (dims.target.offset.toBottom - maxHeight));
    }
    // Is the element too far below us?
    if (dims.target.offset.top + maxHeight > dims.scroll.offset.toBottom) {
      return dims.scroll.scrollTop + (dims.target.offset.top + maxHeight - dims.scroll.offset.toBottom);
    }
    // Must be visible on both ends?
    return;
  }

  // Is Element too far Above Us?
  if (dims.target.margins.offset.top < dims.scroll.offset.top) {
    return dims.scroll.scrollTop - (dims.scroll.offset.top - dims.target.margins.offset.top);
  }

  // Is Element too far Below Us?
  if (dims.target.margins.offset.toBottom > dims.scroll.offset.toBottom) {
    return dims.scroll.scrollTop + (dims.target.margins.offset.toBottom - dims.scroll.offset.toBottom);
  }
}

function moveToTarget() {
  moveBox();
  return moveMasks();
}

// ########################################################################
// HTML
// ########################################################################


var template = '\n  <div id="Tour" class="hidden">\n   <div id="Tour-box-wrap">\n      <div id="Tour-box">\n        <div id="Tour-tip" class="top center"></div>\n       <div id="Tour-close">&#10005</div>\n        <div id="Tour-content">\n          <div id="Tour-inner-content"></div>\n        </div>\n        <div id="Tour-actions">\n          <button class="prev-button" id="Tour-previous"></button>\n     <div id="pager-dot"></div>\n      <button class="next-button" id="Tour-next"></button>\n       </div>\n      </div>\n    </div>\n    <div id="Tour-masks">\n      <div class="mask top"></div>\n      <div class="mask right"></div>\n      <div class="mask bottom"></div>\n      <div class="mask left"></div>\n      <div class="mask center"></div>\n    </div>\n    <canvas id="Tour-canvas"></canvas>\n  </div>\n';

function injectTemplate() {
  var wrap = document.createElement('div');
  document.body.appendChild(wrap);
  wrap.outerHTML = template;
}

// ########################################################################
// Events
// ########################################################################


function clickStop() {
  if (service.current.canExit) {
    stop();
  }
}

function keyDown(e) {
  switch (e.which) {
    case 37:
      previous();
      prevent(e);
      return;
    case 39:
      next();
      prevent(e);
      return;
    case 27:
      if (!service.current.disableEscExit) {
        stop();
        prevent(e);
        return;
      }
    case 38:
    case 40:
      onWindowScroll();
      return;
  }
}

function stopMaskScroll(e) {
  e.stopPropagation(e);
  e.preventDefault(e);
  e.returnValue = false;
  return false;
}

function onBoxScroll(e) {
  var delta = void 0;
  if (e.type == 'DOMMouseScroll') {
    delta = e.detail * -40;
  } else {
    delta = e.wheelDelta;
  }
  var up = delta > 0;
  var scrollTop = els.content[0].scrollTop;

  if (up && !scrollTop) {
    return prevent(e);
  }
  if (!up && els.innerContent.height() - els.content.height() == scrollTop) {
    return prevent(e);
  }
}

function prevent(e) {
  e.stopPropagation(e);
  e.preventDefault(e);
  e.returnValue = false;
  return false;
}

function onWindowScroll() {

  if (els.seeking) {
    return;
  }

  findTarget();
  getDimensions();
  return scrollToTarget().then(function () {
    getDimensions();
    return moveToTarget();
  });
}

function getRootElementSize( ) {
    // Returns a number
    return parseFloat(
        // of the computed font-size, so in px
        getComputedStyle(
            // for the root <html> element
            document.documentElement
        )
        .fontSize
    );
}
function convertRem(value) {
    return value * getRootElementSize();
}


function stepExists(i) {
  return i >= 0 && i < service.current.steps.length;
}

function moveBox() {
  var current = service.current;

  if (!current) {
    return;
  }

  var currentStep = service.current.steps[service.current.index];
  var maxHeight = service.current.maxHeight;
  var maxWidth = convertRem(25); // convert maxWidth: rem --> px
  // Default Position?
  if (!els.target) {
    placeCentered();
    return;
  }

  var placementOptions = {
    bottom: bottom,
    right: right,
    left: left,
    top: top
  };

  var placed = false;

  var placement = currentStep.placement || service.current.placement;

  placement.forEach(function (priority) {
    if (!placed && placementOptions[priority]()) {
      placed = true;
    }
  });

  if (!placed) {
    placeInside('bottom', 'center');
  }

  return Promise.resolve(null);

  // Placement Priorities
  function bottom() {
    // Can Below?
    if (dims.target.margins.offset.fromBottom > maxHeight) {
      // Can Centered?
      if (Math.max(dims.target.offset.left,dims.target.offset.fromRight) + Math.max((maxWidth/2)+(dims.target.width/2), dims.target.width) <= dims.window.width) {
        placeVertically('bottom', 'center');
        return true;
      }
      // Can on the left?
      if (dims.target.offset.fromRight + dims.target.width > maxWidth) {
        placeVertically('bottom', 'left');
        return true;
      }
      // Right, I guess...
      placeVertically('bottom', 'right');
      return true;
    }
  }

  function right() {
    // Can Right?
    if (dims.target.margins.offset.fromRight > maxWidth) {
      // Is Element to Large to fit?
      if (dims.target.margins.height > dims.scroll.height) {
        if (dims.target.offset.top > dims.window.height / 2) {
          placeHorizontally('right', 'top');
          return true;
        }
        if (dims.target.offset.fromBottom > dims.window.height / 2) {
          placeHorizontally('right', 'bottom');
          return true;
        }
        placeHorizontally('right', 'center', true);
        return true;
      }
      // Can Center?
      if (dims.target.height > maxHeight) {
        placeHorizontally('right', 'center');
        return true;
      }
      // can Top?
      if (dims.target.offset.fromBottom + dims.target.height > maxHeight) {
        placeHorizontally('right', 'top');
        return true;
      }
      placeHorizontally('right', 'bottom');
      return true;
    }
  }

  function left() {
    // Can Left?
    if (dims.target.margins.offset.left > maxWidth) {
      // Is Element to Large to fit?
      if (dims.target.margins.height > dims.scroll.height) {
        placeHorizontally('left', 'center', true);
        return true;
      }
      // can Center?
      if (dims.target.height > maxHeight) {
        placeHorizontally('left', 'center');
        return true;
      }
      // can Top?
      if (dims.target.offset.fromBottom + dims.target.height > maxHeight) {
        placeHorizontally('left', 'top');
        return true;
      }
      placeHorizontally('left', 'bottom');
      return true;
    }
  }

  function top() {
    // Can Above?
    if (dims.target.margins.offset.top > maxHeight) {
      // Can Centered?
      if (Math.max(dims.target.offset.left,dims.target.offset.fromRight) + Math.max((maxWidth/2)+(dims.target.width/2), dims.target.width) <= dims.window.width) {
        placeVertically('top', 'center');
        return true;
      }
      // Can on the left?
      if (dims.target.offset.fromRight + dims.target.width > maxWidth) {
        placeVertically('top', 'left');
        return true;
      }
      // Right, I guess...
      placeVertically('top', 'right');
      return true;
    }
  }

  // Placement functions
  function placeVertically(v, h) {
    var top = void 0,
        left = void 0,
        translateX = void 0,
        translateY = void 0,
        tipY = void 0;

    if (v == 'top') {
      top = dims.target.margins.offset.top - current.padding * 2;
      tipY = 'bottom';
      translateY = '-100%';
    } else {
      top = dims.target.margins.offset.toBottom + current.padding * 2;
      tipY = 'top';
      translateY = '0';
    }

    if (h == 'right') {
      left = dims.target.offset.toRight + (current.padding - 10);
      translateX = '-100%';
    } else if (h == 'center') {
      left = dims.target.offset.left + dims.target.width / 2;
      translateX = '-50%';
    } else {
      left = dims.target.offset.left - (current.padding - 10);
      translateX = '0';
    }

    els.wrap.css({
      left: left + 'px',
      top: top + 'px',
      transform: 'translate(' + translateX + ',' + translateY + ')'
    });

    els.tip.attr('class', 'vertical ' + tipY + ' ' + h);
  }

  function placeHorizontally(h, v, fixed) {
    var top = void 0,
        left = void 0,
        translateX = void 0,
        translateY = void 0,
        tipX = void 0;

    if (h == 'right') {
      left = dims.target.margins.offset.toRight + current.padding * 2;
      tipX = 'left';
      translateX = '0';
    } else {
      left = dims.target.margins.offset.left - current.padding * 2;
      tipX = 'right';
      translateX = '-100%';
    }

    if (fixed) {
      top = dims.window.height / 2;
      translateY = '-50%';
    } else if (v == 'top') {
      top = dims.target.offset.top;
      translateY = '0';
    } else if (v == 'center') {
      top = dims.target.offset.top + dims.target.height / 2;
      translateY = '-50%';
    } else {
      top = dims.target.offset.toBottom;
      translateY = '-100%';
    }

    els.wrap.css({
      left: left + 'px',
      top: top + 'px',
      transform: 'translate(' + translateX + ',' + translateY + ')'
    });

    els.tip.attr('class', 'horizontal ' + tipX + ' ' + v);
  }

  function placeInside(v, h) {
    var top = void 0,
        left = void 0,
        translateY = void 0,
        translateX = void 0;

    if (v == 'top') {
      top = dims.target.margins.offset.top < dims.scroll.offset.top ? service.current.margin : dims.target.offset.top;
      translateY = '0';
    } else {
      top = dims.target.margins.offset.toBottom > dims.scroll.offset.toBottom ? dims.scroll.offset.toBottom - service.current.margin : dims.target.offset.toBottom;
      translateY = '-100%';
    }

    if (h == 'right') {
      left = dims.target.offset.left + dims.target.width;
      translateX = '-100%';
    } else if (h == 'center') {
      left = dims.target.offset.left + dims.target.width / 2;
      translateX = '-50%';
    } else {
      left = dims.target.offset.left;
      translateX = '0';
    }

    els.wrap.css({
      left: left + 'px',
      top: top + 'px',
      transform: 'translate(' + translateX + ',' + translateY + ')'
    });

    els.tip.attr('class', 'hidden');
  }

  function placeCentered() {
    els.wrap.css({
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      margin: '0'
    });
    els.tip.attr('class', 'hidden');
  }
}

function moveMasks() {

  if (!service.current) {
    return;
  }

  var padding = service.current.padding || 0;

  if (!els.target) {
    els.masks_top.css({
      height: service.current.maskVisibleOnNoTarget ? '100%' : '0px'
    });
    els.masks_bottom.css({
      height: '0px'
    });
    els.masks_left.css({
      top: '0px',
      height: '100%',
      width: '0px'
    });
    els.masks_right.css({
      top: '0px',
      height: '100%',
      width: '0px'
    });
  } else {

    els.masks_top.css({
      height: dims.target.offset.top + 'px',
      top: dims.target.offset.top < 0 ? dims.target.offset.top + 'px' : 0
    });

    els.masks_bottom.css({
      height: dims.target.offset.fromBottom + 'px',
      bottom: dims.target.offset.fromBottom < 0 ? dims.target.offset.fromBottom + 'px' : 0
    });
    els.masks_left.css({
      top: dims.target.offset.top + 'px',
      height: dims.target.height + 'px',
      width: dims.target.offset.left + 'px'
    });
    els.masks_right.css({
      top: dims.target.offset.top + 'px',
      height: dims.target.height + 'px',
      width: dims.target.offset.fromRight + 'px'
    });

    if (service.current.disableInteraction) {
      els.masks_center.css({
        height: dims.target.height + 2 * padding + 'px',
        top: dims.target.offset.top - padding + 'px',
        left: dims.target.offset.left - padding + 'px',
        right: dims.target.offset.fromRight - padding + 'px',
        backgroundColor: 'transparent'
      });
    }
  }

  if (!service.current.maskVisible) {
    els.canvas.css({
      opacity: 0
    });
    return;
  }
  els.canvas.css({
    opacity: 1
  });

  els.canvas[0].width = dims.window.width * els.pixelRatio;
  els.canvas[0].height = dims.window.height * els.pixelRatio;

  els.canvas.css({
    width: dims.window.width + 'px',
    height: dims.window.height + 'px'
  });

  els.pixelRatio = window.devicePixelRatio || 1;
  if (els.pixelRatio !== 1) {
    els.ctx.scale(els.pixelRatio, els.pixelRatio);
  }

  els.ctx.fillStyle = service.current.maskColor;

  var left = dims.target.offset.left - padding;
  var top = dims.target.offset.top - padding;
  var right = dims.target.offset.toRight + padding;
  var bottom = dims.target.offset.toBottom + padding;

  return new Promise(function (resolve, reject) {
    _TinyAnimate2.default.animate(0, 1, service.current.animationDuration, function (d) {
      els.ctx.clearRect(0, 0, dims.window.width, dims.window.height);

      dims.canvas.left = dims.canvas.left + (left - dims.canvas.left) * d;
      dims.canvas.top = dims.canvas.top + (top - dims.canvas.top) * d;
      dims.canvas.right = dims.canvas.right + (right - dims.canvas.right) * d;
      dims.canvas.bottom = dims.canvas.bottom + (bottom - dims.canvas.bottom) * d;

      drawEmptyRoundedRectangle(els.ctx, dims.canvas.left, dims.canvas.top, dims.canvas.right, dims.canvas.bottom, 5);
      els.ctx.fill();
    }, 'ease', function () { // easeOutQuad removed to fix bug for the iOS animation
      resolve();
    });
  });
}

// ########################################################################
// Canvas Utils
// ########################################################################

function drawEmptyRoundedRectangle(ctx, x, y, x2, y2) {
  var radius = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;
  var target = service.current.steps[service.current.index].target;
  
  ctx.beginPath();

  ctx.moveTo(dims.window.width / 2, 0);
  ctx.lineTo(0, 0);
  ctx.lineTo(0, dims.window.height);
  ctx.lineTo(dims.window.width, dims.window.height);
  ctx.lineTo(dims.window.width, 0);
  ctx.lineTo(dims.window.width / 2, 0);

  // This adds the ability to create circular elements. To use it, type "circle" as a substring in the target element
  if(target.indexOf("circle")>=0) {
       var distX = Math.abs(x-x2);
       var distY = Math.abs(y-y2);
       radius =  Math.abs(Math.max(distX/2, distY/2))
       if (/\d+/g.test(target)) 
         radius = target.match(/\d+/g).join([]);
       ctx.arc(x + (distX/2), y + (distY/2), radius, 0 , 2 * Math.PI);
  } else {
    ctx.lineTo(dims.window.width / 2, y);
    ctx.lineTo(x2 - radius, y);
    ctx.quadraticCurveTo(x2, y, x2, y + radius);
    ctx.lineTo(x2, y2 - radius);
    ctx.quadraticCurveTo(x2, y2, x2 - radius, y2);
    ctx.lineTo(x + radius, y2);
    ctx.quadraticCurveTo(x, y2, x, y2 - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.lineTo(dims.window.width / 2, y);
  }

  ctx.closePath();
}

// ########################################################################
// Utils
// ########################################################################


function validPriorities(priorities) {
  for (var i = 0; i < priorities.length; i += 1) {
    if (defaults.placement.indexOf(priorities[i]) === -1) {
      return false;
    }
  }
  return true;
}

function throttle(callback, limit) {
  var wait = false;
  return function () {
    if (!wait) {
      callback.call();
      wait = true;
      setTimeout(function () {
        wait = false;
      }, limit);
    }
  };
}

function debounce(func, wait, immediate) {
  var timeout = void 0;
  return function () {
    var context = this,
        args = arguments;
    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function resolveEventSystem() {
  var prefix = '',
      _addEventListener = void 0,
      _removeEventListener = void 0,
      onwheel = void 0,
      support = void 0;

  // detect event model
  if (window.addEventListener) {
    _addEventListener = "addEventListener";
    _removeEventListener = "removeEventListener";
  } else {
    _addEventListener = "attachEvent";
    _removeEventListener = "detachEvent";
    prefix = "on";
  }

  // detect available wheel event
  support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
  document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
  "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

  eventUtils.addWheelListener = function (elem, callback, useCapture) {
    _addWheelListener(elem, support, callback, useCapture);

    // handle MozMousePixelScroll in older Firefox
    if (support == "DOMMouseScroll") {
      _addWheelListener(elem, "MozMousePixelScroll", callback, useCapture);
    }
  };

  eventUtils.removeWheelListener = function (elem, callback, useCapture) {
    _removeWheelListener(elem, support, callback, useCapture);

    // handle MozMousePixelScroll in older Firefox
    if (support == "DOMMouseScroll") {
      _removeWheelListener(elem, "MozMousePixelScroll", callback, useCapture);
    }
  };

  function _removeWheelListener(elem, eventName, callback, useCapture) {
    elem[_removeEventListener](prefix + eventName, support == "wheel" ? callback : original, useCapture || false);
  }

  function _addWheelListener(elem, eventName, callback, useCapture) {
    elem[_addEventListener](prefix + eventName, support == "wheel" ? callback : original, useCapture || false);
  }

  function original(originalEvent) {
    !originalEvent && (originalEvent = window.event);

    // create a normalized event object
    var event = {
      // keep a ref to the original event object
      originalEvent: originalEvent,
      target: originalEvent.target || originalEvent.srcElement,
      type: "wheel",
      deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
      deltaX: 0,
      deltaZ: 0,
      preventDefault: function preventDefault() {
        originalEvent.preventDefault ? originalEvent.preventDefault() : originalEvent.returnValue = false;
      }
    };

    // calculate deltaY (and deltaX) according to the event
    if (support == "mousewheel") {
      event.deltaY = -1 / 40 * originalEvent.wheelDelta;
      // Webkit also support wheelDeltaX
      originalEvent.wheelDeltaX && (event.deltaX = -1 / 40 * originalEvent.wheelDeltaX);
    } else {
      event.deltaY = originalEvent.detail;
    }

    // it's time to fire the callback
    return callback(event);
  }
}