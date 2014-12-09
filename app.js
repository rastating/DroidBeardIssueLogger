
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


// ROUTES
// ==============================================

var router = express.Router();

router.use(function (req, res, next) {
    console.log(req.method, req.url);
    next();
});

router.post('/repos/:owner/:repo/issues', function (req, res) {
    res.status(201).send('Submitted the following to ' + req.params.owner + '/' + req.params.repo + '\n\n' + JSON.stringify(req.body));
});

router.post('/exception', function (req, res) {
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

app.listen(5050);
console.log('Started issue logger on port 5050 in ' + (debugging ? 'DEBUG' : 'PRODUCTION') + ' mode.');