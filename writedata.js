#! /usr/bin/env node

var request = require("request");
var cheerio = require("cheerio");
var fs = require('fs');

var requestOptions = {
  url: 'https://www.ticketsource.co.uk/belfasthiddentours',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36'
  }
}

var OUTPUT_FILE = './eventdata.json';

function twelveToTwentyFour(str) {
  // str is "1:00PM" or "11:00AM", "11:30AM" etc
  var out;
  out = str.split(':');

  var isPM = out[1].indexOf('PM') !== -1;
  var is12 = out[0] == '12';
  if (!is12 && isPM) {
    out[0] = parseInt(out[0], 10) + 12;
  }
  if (!isPM && is12) {
    out[0] = '00';
  }
  if (out[0].length === 1) {
    out[0] = '0' + out[0];
  }
  // remove numbers
  out[1] = out[1].replace(/\D/g,'');
  return out.join(':');
}

function groupBy( array , f ) {
  var groups = {};
  array.forEach( function( o ) {
    var group = JSON.stringify( f(o) );
    groups[group] = groups[group] || [];
    groups[group].push( o );
  });
  return Object.keys(groups).map( function( group ) {
    return groups[group];
  });
}

function getADate(str) {
  // str is format "Tue 23 Jun 2015, 12:00PM", or Tue 23 Jun 2015,  1:00PM"
  var out;
  // remove comma
  out = str.replace(',', '');
  // remove empty array elements
  out = out.split(' ').filter(Boolean);
  // E.g.  ["Tue", "23", "Jun", "2015", "12:00PM"]
  // 'Wed, 09 Aug 1995 00:00:00 GMT' is what we want
  out = out[0] + ', ' + out[1] + ' ' + out[2] + ' ' + out[3] + ' ' + twelveToTwentyFour(out[4]) + ' GMT';
  var date = new Date(out);
  return  date;
}

function fetch() {
  request(requestOptions, function (error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);
      var events = [];
      var groupedEvents = {};
      var output = '';

      $('.event-table tr').each(function(i, elem) {

        var eventDate = getADate($(this).find('td[itemprop=startDate]').text().trim());
        var dateString = ('0' + (eventDate.getMonth() + 1)).slice(-2) + '-' + ('0' + eventDate.getDate()).slice(-2) + '-' + eventDate.getFullYear();

        if (!groupedEvents[dateString]) {
          groupedEvents[dateString] = [];
        }

        groupedEvents[dateString].push({
           id: $(this).data('id'),
          name: $(this).find('td[itemprop=name]').text().trim(),
          link: 'https://www.ticketsource.co.uk' + $(this).find('a[itemprop=url]').attr('href'),
          date: eventDate,
          day: dateString,
          time:eventDate.toTimeString().substring(0, 5),
          ticketsAvailable: $(this).find('td.ticket-count').text(),
          venueName: $(this).find('span[itemprop=name]').text(),
          venueLink: 'https://www.ticketsource.co.uk' + $(this).find('td[itemprop=location] > a').attr('href')
        });

      });

      output = 'var tourData = {\n';

      for (var day in groupedEvents) {
        if (groupedEvents.hasOwnProperty(day)) {
          var daysEvents = groupedEvents[day];
          output += '\t\'' + day + '\' : \'';
          for (var i = 0; i < daysEvents.length; i++) {
            output += '<a target="_blank" href="' + daysEvents[i].link + '">';
            output += daysEvents[i].time;
            if (daysEvents[i].name && daysEvents[i].name.toLowerCase().indexOf('pub') !== -1) {
              output += ' - Pub Experience';
            } else {
              output += ' - Walking tour';
            }
            output += '</a> ';
          }
          output += '\',\n';
        }
      }

      output += '};';

      fs.writeFile('tours.js', output, function (err) {
        if (err) {
          return console.log(err);
        }
      });
    } else {
      console.log("We’ve encountered an error: " + error);
    }
  });
}

module.exports = {
  fetch: fetch
};

