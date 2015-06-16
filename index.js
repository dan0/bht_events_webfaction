#! /usr/bin/env node

var request = require("request");
var cheerio = require("cheerio");
var jf = require('jsonfile');
var	url = "https://www.ticketsource.co.uk/belfasthiddentours";

var OUTPUT_FILE = './eventdata.json'

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
	return Date.parse(out);
}

request(url, function (error, response, body) {
	if (!error) {
		var $ = cheerio.load(body);
    var events = [];
		var output;

    $('.event-table tr').each(function(i, elem) {
      events.push({
        id: $(this).data('id'),
				name: $(this).find('td[itemprop=name]').text().trim(),
				link: 'https://www.ticketsource.co.uk' + $(this).find('a[itemprop=url]').attr('href'),
				date: getADate($(this).find('td[itemprop=startDate]').text().trim()),
				ticketsAvailable: $(this).find('td.ticket-count').text(),
				venueName: $(this).find('span[itemprop=name]').text(),
				venueLink: 'https://www.ticketsource.co.uk/' + $(this).find('td[itemprop=location] > a').attr('href')
      })
    });

    jf.spaces = 2;
    jf.writeFile(OUTPUT_FILE, events, function(err) {
      if (err) {
        console.log(err);
      }
    })
		//console.log(output);
	} else {
		console.log("We’ve encountered an error: " + error);
	}
});
