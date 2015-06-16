var http = require('http');
var fs = require('fs');

http.createServer(function (request, response) {
  
	fs.readFile('./eventdata.json', function(error, content) {
		if (error) {
			response.writeHead(500);
			response.end();
		}
		else {
      response.setHeader('Access-Control-Allow-Origin', '*');
			response.writeHead(200, { 'Content-Type': 'application/json' });
			response.end(content, 'utf-8');
		}
	});

}).listen(32494);
console.log('Server running at http://127.0.0.1:8125/');
