var React = require('react');

var timelines;
var eventsMinDistance = 60;
var context;

// Initialize Firebase
var config = {
  apiKey: "AIzaSyCK0MjmJaxtIp1oCn8xWTe15F3638xFbqY",
  authDomain: "timeline-a9201.firebaseapp.com",
  databaseURL: "https://timeline-a9201.firebaseio.com",
  projectId: "timeline-a9201",
  storageBucket: "",
  messagingSenderId: "87334788133"
};
firebase.initializeApp(config);

var database = firebase.database();

module.exports = React.createClass({

  getInitialState: function () {
    return {
      items: []
    }
  },

  componentDidMount: function () {
    context = this;
    timelines = $('.cd-horizontal-timeline');
    firebase.database().ref('/items').on("value", function (snapshot) {
      console.log('VAL', snapshot.val());
      context.setState({ items: snapshot.val() })
      context.initialize(timelines);
    }, function (errorObject) {
      console.log("The read failed: " + errorObject.code);
    });
  },

  initialize: function (timelines) {
    timelines.each(function () {
      var timeline = $(this),
        timelineComponents = {};

      //cache timeline components 
      timelineComponents['timelineWrapper'] = timeline.find('.events-wrapper');
      timelineComponents['eventsWrapper'] = timelineComponents['timelineWrapper'].children('.events');
      timelineComponents['fillingLine'] = timelineComponents['eventsWrapper'].children('.filling-line');
      timelineComponents['timelineEvents'] = timelineComponents['eventsWrapper'].find('a');
      timelineComponents['timelineDates'] = context.parseDate(timelineComponents['timelineEvents']);
      timelineComponents['eventsMinLapse'] = context.minLapse(timelineComponents['timelineDates']);
      timelineComponents['timelineNavigation'] = timeline.find('.cd-timeline-navigation');
      timelineComponents['eventsContent'] = timeline.children('.events-content');

      //assign a left postion to the single events along the timeline
      context.setDatePosition(timelineComponents, eventsMinDistance);
      //assign a width to the timeline
      var timelineTotWidth = context.setTimelineWidth(timelineComponents, eventsMinDistance);
      //the timeline has been initialize - show it
      timeline.addClass('loaded');

      //detect click on the next arrow
      timelineComponents['timelineNavigation'].on('click', '.next', function (event) {
        event.preventDefault();
        context.updateSlide(timelineComponents, timelineTotWidth, 'next');
      });
      //detect click on the prev arrow
      timelineComponents['timelineNavigation'].on('click', '.prev', function (event) {
        event.preventDefault();
        context.updateSlide(timelineComponents, timelineTotWidth, 'prev');
      });
      //detect click on the a single event - show new event content
      timelineComponents['eventsWrapper'].on('click', 'a', function (event) {
        event.preventDefault();
        timelineComponents['timelineEvents'].removeClass('selected');
        $(this).addClass('selected');
        context.updateOlderEvents($(this));
        context.updateFilling($(this), timelineComponents['fillingLine'], timelineTotWidth);
        context.updateVisibleContent($(this), timelineComponents['eventsContent']);
      });

      //on swipe, show next/prev event content
      timelineComponents['eventsContent'].on('swipeleft', function () {
        var mq = context.checkMQ();
        (mq == 'mobile') && context.showNewContent(timelineComponents, timelineTotWidth, 'next');
      });
      timelineComponents['eventsContent'].on('swiperight', function () {
        var mq = context.checkMQ();
        (mq == 'mobile') && context.showNewContent(timelineComponents, timelineTotWidth, 'prev');
      });

      //keyboard navigation
      $(document).keyup(function (event) {
        if (event.which == '37' && context.elementInViewport(timeline.get(0))) {
          context.showNewContent(timelineComponents, timelineTotWidth, 'prev');
        } else if (event.which == '39' && context.elementInViewport(timeline.get(0))) {
          context.showNewContent(timelineComponents, timelineTotWidth, 'next');
        }
      });
    });
  },

  updateSlide: function (timelineComponents, timelineTotWidth, string) {
    //retrieve translateX value of timelineComponents['eventsWrapper']
    var translateValue = context.getTranslateValue(timelineComponents['eventsWrapper']),
      wrapperWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', ''));
    //translate the timeline to the left('next')/right('prev') 
    (string == 'next')
      ? context.translateTimeline(timelineComponents, translateValue - wrapperWidth + eventsMinDistance, wrapperWidth - timelineTotWidth)
      : context.translateTimeline(timelineComponents, translateValue + wrapperWidth - eventsMinDistance);
  },

  showNewContent: function (timelineComponents, timelineTotWidth, string) {
    //go from one event to the next/previous one
    var visibleContent = timelineComponents['eventsContent'].find('.selected'),
      newContent = (string == 'next') ? visibleContent.next() : visibleContent.prev();

    if (newContent.length > 0) { //if there's a next/prev event - show it
      var selectedDate = timelineComponents['eventsWrapper'].find('.selected'),
        newEvent = (string == 'next') ? selectedDate.parent('li').next('li').children('a') : selectedDate.parent('li').prev('li').children('a');

      context.updateFilling(newEvent, timelineComponents['fillingLine'], timelineTotWidth);
      context.updateVisibleContent(newEvent, timelineComponents['eventsContent']);
      newEvent.addClass('selected');
      selectedDate.removeClass('selected');
      context.updateOlderEvents(newEvent);
      context.updateTimelinePosition(string, newEvent, timelineComponents);
    }
  },

  updateTimelinePosition: function (string, event, timelineComponents) {
    //translate timeline to the left/right according to the position of the selected event
    var eventStyle = window.getComputedStyle(event.get(0), null),
      eventLeft = Number(eventStyle.getPropertyValue("left").replace('px', '')),
      timelineWidth = Number(timelineComponents['timelineWrapper'].css('width').replace('px', '')),
      timelineTotWidth = Number(timelineComponents['eventsWrapper'].css('width').replace('px', ''));
    var timelineTranslate = context.getTranslateValue(timelineComponents['eventsWrapper']);

    if ((string == 'next' && eventLeft > timelineWidth - timelineTranslate) || (string == 'prev' && eventLeft < - timelineTranslate)) {
      context.translateTimeline(timelineComponents, - eventLeft + timelineWidth / 2, timelineWidth - timelineTotWidth);
    }
  },

  translateTimeline: function (timelineComponents, value, totWidth) {
    var eventsWrapper = timelineComponents['eventsWrapper'].get(0);
    value = (value > 0) ? 0 : value; //only negative translate value
    value = (!(typeof totWidth === 'undefined') && value < totWidth) ? totWidth : value; //do not translate more than timeline width
    context.setTransformValue(eventsWrapper, 'translateX', value + 'px');
    //update navigation arrows visibility
    (value == 0) ? timelineComponents['timelineNavigation'].find('.prev').addClass('inactive') : timelineComponents['timelineNavigation'].find('.prev').removeClass('inactive');
    (value == totWidth) ? timelineComponents['timelineNavigation'].find('.next').addClass('inactive') : timelineComponents['timelineNavigation'].find('.next').removeClass('inactive');
  },

  updateFilling: function (selectedEvent, filling, totWidth) {
    //change .filling-line length according to the selected event
    var eventStyle = window.getComputedStyle(selectedEvent.get(0), null),
      eventLeft = eventStyle.getPropertyValue("left"),
      eventWidth = eventStyle.getPropertyValue("width");
    eventLeft = Number(eventLeft.replace('px', '')) + Number(eventWidth.replace('px', '')) / 2;
    var scaleValue = eventLeft / totWidth;
    context.setTransformValue(filling.get(0), 'scaleX', scaleValue);
  },

  setDatePosition: function (timelineComponents, min) {
    for (i = 0; i < timelineComponents['timelineDates'].length; i++) {
      var distance = context.daydiff(timelineComponents['timelineDates'][0], timelineComponents['timelineDates'][i]),
        distanceNorm = Math.round(distance / timelineComponents['eventsMinLapse']) + 2;
      timelineComponents['timelineEvents'].eq(i).css('left', distanceNorm * min + 'px');
    }
  },

  setTimelineWidth: function (timelineComponents, width) {
    var timeSpan = context.daydiff(timelineComponents['timelineDates'][0], timelineComponents['timelineDates'][timelineComponents['timelineDates'].length - 1]),
      timeSpanNorm = timeSpan / timelineComponents['eventsMinLapse'],
      timeSpanNorm = Math.round(timeSpanNorm) + 4,
      totalWidth = timeSpanNorm * width;
    timelineComponents['eventsWrapper'].css('width', totalWidth + 'px');
    context.updateFilling(timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents['fillingLine'], totalWidth);
    context.updateTimelinePosition('next', timelineComponents['eventsWrapper'].find('a.selected'), timelineComponents);

    return totalWidth;
  },

  updateVisibleContent: function (event, eventsContent) {
    var eventDate = event.data('date'),
      visibleContent = eventsContent.find('.selected'),
      selectedContent = eventsContent.find('[data-date="' + eventDate + '"]'),
      selectedContentHeight = selectedContent.height();

    if (selectedContent.index() > visibleContent.index()) {
      var classEnetering = 'selected enter-right',
        classLeaving = 'leave-left';
    } else {
      var classEnetering = 'selected enter-left',
        classLeaving = 'leave-right';
    }

    selectedContent.attr('class', classEnetering);
    visibleContent.attr('class', classLeaving).one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function () {
      visibleContent.removeClass('leave-right leave-left');
      selectedContent.removeClass('enter-left enter-right');
    });
    eventsContent.css('height', selectedContentHeight + 'px');
  },

  updateOlderEvents: function (event) {
    event.parent('li').prevAll('li').children('a').addClass('older-event').end().end().nextAll('li').children('a').removeClass('older-event');
  },

  getTranslateValue: function (timeline) {
    var timelineStyle = window.getComputedStyle(timeline.get(0), null),
      timelineTranslate = timelineStyle.getPropertyValue("-webkit-transform") ||
        timelineStyle.getPropertyValue("-moz-transform") ||
        timelineStyle.getPropertyValue("-ms-transform") ||
        timelineStyle.getPropertyValue("-o-transform") ||
        timelineStyle.getPropertyValue("transform");

    if (timelineTranslate.indexOf('(') >= 0) {
      var timelineTranslate = timelineTranslate.split('(')[1];
      timelineTranslate = timelineTranslate.split(')')[0];
      timelineTranslate = timelineTranslate.split(',');
      var translateValue = timelineTranslate[4];
    } else {
      var translateValue = 0;
    }

    return Number(translateValue);
  },

  setTransformValue: function (element, property, value) {
    element.style["-webkit-transform"] = property + "(" + value + ")";
    element.style["-moz-transform"] = property + "(" + value + ")";
    element.style["-ms-transform"] = property + "(" + value + ")";
    element.style["-o-transform"] = property + "(" + value + ")";
    element.style["transform"] = property + "(" + value + ")";
  },

  //based on http://stackoverflow.com/questions/542938/how-do-i-get-the-number-of-days-between-two-dates-in-javascript
  parseDate: function (events) {
    var dateArrays = [];
    events.each(function () {
      var singleDate = $(this),
        dateComp = singleDate.data('date').split('T');
      if (dateComp.length > 1) { //both DD/MM/YEAR and time are provided
        var dayComp = dateComp[0].split('/'),
          timeComp = dateComp[1].split(':');
      } else if (dateComp[0].indexOf(':') >= 0) { //only time is provide
        var dayComp = ["2000", "0", "0"],
          timeComp = dateComp[0].split(':');
      } else { //only DD/MM/YEAR
        var dayComp = dateComp[0].split('/'),
          timeComp = ["0", "0"];
      }
      var newDate = new Date(dayComp[2], dayComp[1] - 1, dayComp[0], timeComp[0], timeComp[1]);
      dateArrays.push(newDate);
    });
    return dateArrays;
  },

  daydiff: function (first, second) {
    return Math.round((second - first));
  },

  minLapse: function (dates) {
    //determine the minimum distance among events
    var dateDistances = [];
    for (i = 1; i < dates.length; i++) {
      var distance = context.daydiff(dates[i - 1], dates[i]);
      dateDistances.push(distance);
    }
    return Math.min.apply(null, dateDistances);
  },

  /*
    How to tell if a DOM element is visible in the current viewport?
    http://stackoverflow.com/questions/123999/how-to-tell-if-a-dom-element-is-visible-in-the-current-viewport
  */
  elementInViewport: function (el) {
    var top = el.offsetTop;
    var left = el.offsetLeft;
    var width = el.offsetWidth;
    var height = el.offsetHeight;

    while (el.offsetParent) {
      el = el.offsetParent;
      top += el.offsetTop;
      left += el.offsetLeft;
    }

    return (
      top < (window.pageYOffset + window.innerHeight) &&
      left < (window.pageXOffset + window.innerWidth) &&
      (top + height) > window.pageYOffset &&
      (left + width) > window.pageXOffset
    );
  },

  checkMQ: function () {
    //check if mobile or desktop device
    return window.getComputedStyle(document.querySelector('.cd-horizontal-timeline'), '::before').getPropertyValue('content').replace(/'/g, "").replace(/"/g, "");
  },

  render: function () {
    return (
      <section className="cd-horizontal-timeline">
        <h2 className="timeline-title">Fundamentos de física - UN</h2>
        <div className="timeline">
          <div className="events-wrapper">
            <div className="events">
              <ol>
                {this.state.items.map(function (item, i) {
                  return (
                    <li key={i}><a href="#0" data-date={item.formatDate} className={item.myClass}>{item.date}</a></li>
                  )
                }.bind(this))}
              </ol>
              <span className="filling-line" aria-hidden="true"></span>
            </div>
          </div>
          <ul className="cd-timeline-navigation">
            <li><a href="#0" className="prev inactive">Prev</a></li>
            <li><a href="#0" className="next">Next</a></li>
          </ul>
        </div>
        <div className="events-content">
          <ol>
            {this.state.items.map(function (item, i) {
              return (
                <li key={i} className={item.myClass} data-date={item.formatDate}>
                  <h2>{item.title}</h2>
                  <em>{item.subtitle}</em>
                  <p> {item.desc}</p>
                </li>
              )
            }.bind(this))}
          </ol>
        </div>
        <p className="credits"><b>Autores: </b>Juan Rodriguez y Melanie Martínez.</p>
      </section>
    );
  }
});