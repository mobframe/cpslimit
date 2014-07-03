var cpsLimit = require('cpsLimit');
var http = require('http');

var conf = {
    'app': 100,
}

cpsLimit.init(conf)

var server = http.createServer(function (request, response) {
    var isLimited = cpsLimit.check('app');
    if (isLimited) {
        //do something... 
    } 
});

server.listen();
