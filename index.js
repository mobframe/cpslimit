var EventEmitter = require('events').EventEmitter;

var cpsLimit = module.exports = new EventEmitter;

cpsLimit.init = function (conf) {
    if ('object' !== typeof conf) {
        throw new Error('please be sure you have a correct conf');
        return false;
    }
    this.conf = conf;
    this.isLimited = {};
    this.disabled = false;
    this.current = 0;
    this.counters = {};
}

cpsLimit.check = function (id) {
    if ('undefined' === typeof this.conf[id]) {
        return false;
    }

    var seconds = Math.floor(new Date().getTime() / 1000);
    if (this.current !== seconds) {
        this.current = seconds;
        this.counters = {};
    } 

    this.counters[id] ? this.counters += 1 : this.counter = 1; 

    if (this.counters[id] > this.cpsConf[id]) {
        return this.isLimited[id] = true;
    } else {
        return this.isLimited[id] = false;
    }
}



cpsLimit.master = new EventEmitter;

cpsLimit.master.init = function (conf) {
    if ('object' !== typeof conf) {
        throw new Error('please be sure you have a correct conf');
        return false;
    }

    this.cpsConf = conf;
    this.isLimited = {};
    this.disabled = false;
    this.current = 0;
    this.counters = {};
    this.workers = [];
    
};

cpsLimit.master.bind = function (worker) {
    if ('object' !== typeof worker) {
        throw new Error('there is no worker process');
        return false;
    }

    var self = this;
    console.log('bind worker id: ' + worker.process.pid)
    this.workers.push(worker); 
    worker.on('message', function(msg) {
        if (self.disabled || 'object' !== typeof msg) {
            return false;
        }
        if (msg.action === 'cpsPlus') {
            console.log('worker' + this.process.pid)
            self.count(msg.id);
        }
    })
};

cpsLimit.master.count = function (id) {
    var seconds = Math.floor(new Date().getTime() / 1000);
    if (seconds !== this.current) {  //new second, clear all counts;
        this.current = seconds;
        this.counters = {};
        if (this.isLimited[id]) {
            this.isLimited[id] = false;
            this.informWorkers({action: 'cpsLimit', id: id, isLimited: false});
        }
    }
    if (!this.counters[id]) {
        this.counters[id] = 0;
    }
    this.counters[id] += 1;
    console.log('counters is' + this.counters[id])
    if (this.counters[id] > (this.cpsConf[id] || 0)) {
        this.isLimited[id] = true;
        this.informWorkers({action: 'cpsLimit', id: id, isLimited: true}); 
    }

};

cpsLimit.master.informWorkers = function (msg, workers) {
    workers = workers || this.workers;
    for (var i in workers) {
        workers[i].send(msg);
    }
}

cpsLimit.master.enable = function () {
    this.disabled = false;
};

cpsLimit.master.disable = function () {
    this.disabled = true;
};




cpsLimit.worker = new EventEmitter;

cpsLimit.worker.init = function () {
    var self = this;
    this.isLimited = {};

    process.on('message', function (msg) {
        if ('object' === typeof msg && msg.action === 'cpsLimit') {
            self.isLimited[msg.id] = msg.isLimited;
            self.emit('limit', msg)
        }
    })
};

cpsLimit.worker.check = function (id) {
    this.plus(id);
    if ('undefined' === typeof this.isLimited[id]) {
        return false;
    }
    return this.isLimited[id];
};

cpsLimit.worker.plus = function (id) {
    process.send({action: 'cpsPlus', id: id,});
}


