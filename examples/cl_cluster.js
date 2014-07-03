var cluster = require('cluster');
var cpsLimit = require('../');
var http = require('http');

var conf = {
    'app': 4,
}

if (cluster.isMaster) {
    cpsLimit.master.init(conf);    
    cluster.on('online', function (worker) {
        console.log('bind worker');
        cpsLimit.master.bind(worker); 
    })
    for (var i = 0; i < 2; i++) {
        cluster.fork()
    }
} else {
    cpsLimit.worker.init();
    var server = http.createServer(function (request, response) {
        response.writeHead(200, {"Content-Type": "text/plain"});
        console.log('check' + process.pid);
        var isLimited = cpsLimit.worker.check('app');
        if (isLimited) {
            //do something... 
            console.log('limited')
        }
        response.end();
    });

    server.listen('8000');
}



