var EventEmitter = require('events').EventEmitter;

var cpsLimit = module.exports = new EventEmitter;

cpsLimit.init = function (conf) {
    if ('object' !== typeof conf) {
        return false;
    }
    this.cpsConf = conf;
    this.isLimited = {};
    this.disabled = false;
    this.current = 0;
    this.count = {};
}

cpsLimit.check = function (id) {
    var seconds = Math.floor(new Date().getTime() / 1000);
    if (this.current !== seconds) {
        this.current = seconds;
        this.count = {};
    } 
    this.plus(id);
    if (this.count[id] > (this.cpsConf[id] || 0)) {
        return this.isLimited[id] = true;
    } else {
        return this.isLimited[id] = false;
    }
}

cpsLimit.plus = function (id) {
    if (this.count[id]) {
        this.count[id] = 1;
    } else {
        this.count[id] += 1;
    } 
};




cpsLimit.master = new EventEmitter;

cpsLimit.master.init = function (conf, cluster) {
    if ('object' !== typeof cluster || 'object' !== typeof conf) {
        return false;
    }

    this.cluster = cluster;
    this.cpsConf = conf;
    this.isLimited = {};
    this.disabled = false;
    this.current = 0;
    this.count = {};
    this.workers = [];
    
};

cpsLimit.master.bind = function (worker) {
    var self = this;

    if ('object' !== typeof cluster) {
        return false;
    }

    this.workers.push(worker); 

    worker.on('message', function(msg) {
        if (self.disabled || 'object' !== typeof msg) {
            return false;
        }
        if (msg.action === 'cpsPlus') {
            self.counter(msg.id);
        }
        self.emit('plus', msg);
    })
};

cpsLimit.master.counter = function (id) {
    var seconds = Math.floor(new Date().getTime() / 1000);
    if (seconds !== this.current) {  //new second, clear all counts;
        this.current = seconds;
        this.count = {};
        if (this.isLimited[id]) {
            this.isLimited[id] = false;
            this.unlimitWorkers();
        }
    }
    if (!this.count[id]) {
        this.count[id] = 0;
    }
    this.count[id] += 1;
    if (this.count[id] > (this.cpsConf[id] || 0)) {
        this.isLimited[id] = true;
        this.limitWorkers(); 
    }

};

cpsLimit.master.limitWorkers = function () {
    for (var worker_id in self.workers) {
        self.workers[worker_id].send({action: 'cpsLimit', id: id, isLimited : true});
    }
}

cpsLimit.master.unlimitWorkers = function () {
    for (var worker_id in self.workers) {
        self.workers[worker_id].send({action: 'cpsLimit', id: id, isLimited : false});
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
    this.isLimited = {};
    this.bind();
};

cpsLimit.worker.bind = function () {
    var self = this;
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

