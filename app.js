
// BASE SETUP
// ==============================================

var args        = require('minimist')(process.argv.slice(2));
var request     = require('request');
var express     = require('express');
var bodyParser  = require('body-parser');
var app         = express();
var debugging   = args.d;
var token       = args.t;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// BLACK LISTED SUBJECTS
// ==============================================

var blacklist = [
    /Connection to (.*) refused/,
    /Unable to resolve host "(.*)": No address associated with hostname/
];

// ROUTES
// ==============================================

var router = express.Router();
var requestCounts = {};
var requestLimit =  50;

router.use(function (req, res, next) {
    console.log(req.method, req.url);
    next();
});

router.use(function (req, res, next) {
    if (!requestCounts[req.ip]) {
        requestCounts[req.ip] = 0;
    }

    requestCounts[req.ip] += 1;
    
    if (requestCounts[req.ip] > requestLimit) {
        console.log(req.ip + ' exceeded request limit.');
        res.send({ "error": true, "message": "Limit exceeded" });
    }
    else {
        next();
    }
});

router.post('/repos/:owner/:repo/issues', function (req, res) {
    res.status(201).send('Submitted the following to ' + req.params.owner + '/' + req.params.repo + '\n\n' + JSON.stringify(req.body));
});

router.post('/exception', function (req, res) {
    for (var i = 0; i < blacklist.length; i++) {
        if (req.body.exception.match(blacklist[i])) {
            res.status(400).send({ "error": true, "message": 'Blacklisted exception' });
            return;
        }
    }

    var baseUrl = debugging ? 'http://127.0.0.1:5050' : 'https://api.github.com';
    var options = {
        url: baseUrl + '/repos/rastating/droidbeard/issues?access_token=' + token,
        headers: { "User-Agent": "DroidBeard Issue Logger" },
        json: true,
        body: {
            "title": "Error Report: " + req.body.exception,
            "body": '```\n' + req.body.stackTrace + '\n```',
            "labels": [
                "in-app error report",
                "bug"
            ]
        }
    }

    request.post(options, function (error, response, body) {
        if (!error && response.statusCode == 201) {
            if (debugging) {
                res.status(201).send(body);
            }
            else {
                console.log('Logged issue ' + body.number);
                res.status(201).send({ "number": body.number });
            }
        }
        else {
            res.status(response.statusCode).send({ "error": true });
        }
    });
});

app.use('/', router);

// EXPRESS SERVER & RATE LIMITER
// ==============================================

app.listen(5050);
console.log('Started issue logger on port 5050 in ' + (debugging ? 'DEBUG' : 'PRODUCTION') + ' mode.');

setInterval(function () {
    requestCounts = {};
}, 60 * 60 * 1000);