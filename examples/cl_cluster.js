var cluster = require('cluster');
var cpsLimit = require('../');
var http = require('http');

var conf = {
    'app': 2,
}

if (cluster.isMaster) {
    cpsLimit.master.init(conf);    
    cluster.on('online', function (worker) {
        cpsLimit.master.bind(worker); 
    })
    for (var i = 0; i < 2; i++) {
        cluster.fork()
    }
} else {
    cpsLimit.worker.init();
    var server = http.createServer(function (request, response) {
        var isLimited = cpsLimit.worker.check('app');
        if (isLimited) {
            //do something... 
            console.log('limited')
        }
    });

    server.listen('8000');
}



