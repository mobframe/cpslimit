var cluster = require('cluster');
var cpsLimit = require('cpsLimit');
var http = require('http');

var conf = {
    'app': 100,
}

if (cluster.isMaster) {
    cpsLimit.master.init(conf);    
    cluster.on('online', function (worker) {
        cpslimit.master.bind(worker); 
    })
} else {
    cpsLimit.worker.init();
    var server = http.createServer(function (request, response) {
        var isLimited = cpsLimit.worker.check('app');
        if (isLimited) {
            //do something... 
        }
    });

    server.listen();
}



