var request = require('supertest');
var should = require('should');
var testUtils = require("../../test/testUtils");
request = request.agent(testUtils.url);
//var plugins = require("./../pluginManager");
//var db = plugins.dbConnection();
var APP_KEY = "97a960c558df5f4862fd7dab90c2d50fcd6591cd";
var API_KEY_ADMIN = "bbce41a84428710402650b10137bea20";
var APP_ID = "5c3c55e5cf50054aa7fd167b";
//var DEVICE_ID = "1234567890";

//add data
//test if added
//ask for getTable
//recalculate
var myTime = Date.now();
var start = new Date(new Date().getFullYear(), 0, 0);

var tableResponse = {};

var viewsListed = [];

var graphResponse = {};

tableResponse.hour = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse.yesterday = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse["30days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse["7days"] = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]};
tableResponse.month = {"iTotalRecords": 0, "iTotalDisplayRecords": 0, "aaData": [{"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0}]}; //this year


graphResponse.hour = {};
graphResponse.yesterday = {};
graphResponse["30days"] = {};

var days_this_year;

function pushValues(period, index, map) {
    for (var key in map) {
        if (!tableResponse[period].aaData[index]) {
            tableResponse[period].aaData[index] = {"u": 0, "t": 0, "s": 0, "b": 0, "e": 0, "d-calc": 0, "d": 0, "n": 0, "scr-calc": 0, "scr": 0, "uvalue": 0};
        }
        if (!tableResponse[period].aaData[index][key]) {
            tableResponse[period].aaData[index][key] = 0;
        }
        tableResponse[period].aaData[index][key] += map[key];
    }
}
function verifyMetrics(err, ob, done, correct) {
    if (!ob) {
        return false;
    }
    for (var c in correct) {
        if (ob[c] == null) {
            ob[c] = 0;
        }
        if (c == 'uvalue') { //because calculated value might be a bit different based on which side of month you are in.
            if (ob[c] != correct[c] && ob[c] - 1 != correct[c] && ob[c] + 1 != correct[c]) {
                console.log(c + " " + ob[c] + " " + correct[c]);
                return false;
            }
        }
        else if (ob[c] != correct[c]) {
            console.log(c + " " + ob[c] + " " + correct[c]);
            return false;
        }
    }
    return true;

}

function verifySegments(values) {
    it('checking segments', function(done) {
        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=get_view_segments')
            .expect(200)
            .end(function(err, res) {
                var resDecoded = JSON.parse(res.text);
                resDecoded = resDecoded.segments;
                for (var z in values) {
                    if (z != 'testSegment') {
                        if (resDecoded[z]) {
                            if (values[z].length != resDecoded[z].length) {
                                done("Invalid segment count for: " + z);
                                return;
                            }
                            else {
                                for (var p = 0; p < values[z].length; p++) {
                                    if (resDecoded[z].indexOf(values[z][p]) == -1) {
                                        done("Segment value missing " + z + ":" + values[z][p]);
                                        return;
                                    }
                                }
                            }
                        }
                        else {
                            done("Segment key missing: " + z);
                            return;
                        }
                    }
                }
                for (var z in resDecoded) {
                    if (!values[z]) {
                        done("Invalid segment key: " + z);
                        return;
                    }
                }

                done();
            });
    });

}

function verifyTotals(period) {
    it('checking result(' + period + ')', function(done) {
        request
            .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable&iSortCol_0=0&sSortDir_0=asc&period=' + period)
            .expect(200)
            .end(function(err, res) {
                var resDecoded = JSON.parse(res.text);

                resDecoded.iTotalRecords.should.eql(tableResponse[period].iTotalRecords);
                resDecoded.iTotalDisplayRecords.should.eql(tableResponse[period].iTotalDisplayRecords);
                if (resDecoded.aaData.length > 0 && tableResponse[period].aaData.length > 0) {
                    if (!tableResponse[period].aaData[tableResponse[period].aaData.length - 1]._id) {
                        viewsListed.push({"view": resDecoded.aaData[tableResponse[period].aaData.length - 1]._id, "action": ""});
                        tableResponse[period].aaData[tableResponse[period].aaData.length - 1]._id = resDecoded.aaData[tableResponse[period].aaData.length - 1]._id;
                    }
                    for (var i = 0; i < resDecoded.aaData.length; i++) {
                        if (verifyMetrics(err, resDecoded.aaData[i], done, tableResponse[period].aaData[i]) == false) {
                            return done("wrong values");
                        }
                    }
                    done();

                }
                else {
                    done();
                }
            });
    });

    /*  it('checking graph('+period+')',function(done) {
        var viewsList = JSON.stringify(viewsListed);
        
        console.log('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=views&action=&period='+period+'&selectedViews='+viewsList);
        request
            .get('/o?api_key='+API_KEY_ADMIN+'&app_id='+APP_ID+'&method=views&action=&period='+period+'&selectedViews='+viewsList)
            .expect(200)
            .end(function(err, res){
                var resDecoded = JSON.parse(res.text);
                console.log(resDecoded);
                done();
            });
    });*/
}
//chose testDay(yesterday)
describe('Testing views plugin', function() {
    describe('verify empty views tables', function() {
        it('should have 0 views', function(done) {
            days_this_year = Math.floor((myTime - start) / (1000 * 24 * 60 * 60));
            console.log(days_this_year);
            API_KEY_ADMIN = testUtils.get("API_KEY_ADMIN");
            APP_ID = testUtils.get("APP_ID");
            APP_KEY = testUtils.get("APP_KEY");
            request
                .get('/o?api_key=' + API_KEY_ADMIN + '&app_id=' + APP_ID + '&method=views&action=getTable')
                .expect(200)
                .end(function(err, res) {
                    res.text.should.eql('{"iTotalRecords":0,"iTotalDisplayRecords":0,"aaData":[]}');
                    done();
                });
        });
    });

    describe('Check adding views', function() {
        it('adding view in previous year', function(done) {
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user00" + '&timestamp=' + (myTime - (365 * 24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('adding view(25 days ago)', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});

            if (days_this_year > 25) {
                tableResponse.month.iTotalRecords += 1;
                tableResponse.month.iTotalDisplayRecords += 1;
                pushValues("month", 0, {"t": 1, "s": 1, "uvalue": 1, "n": 1});
            }
            else {
                tableResponse.month.iTotalRecords = 1;
                tableResponse.month.iTotalDisplayRecords = 1; //add count anyway because we have also "0" in list
            }
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - (25 * 24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 10000 * testUtils.testScalingFactor);
                });
        });
    });

    describe('verifying totals after last update', function() {
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Check adding view(yesterday)', function() {
        it('adding view', function(done) {
            tableResponse.yesterday.iTotalRecords += 1;
            tableResponse.yesterday.iTotalDisplayRecords += 1;
            pushValues("yesterday", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});

            pushValues("30days", 0, {"u": 1, "t": 1, "s": 1});

            tableResponse["7days"].iTotalRecords += 1;
            tableResponse["7days"].iTotalDisplayRecords += 1;
            pushValues("7days", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});

            if (days_this_year > 1) {
                tableResponse.month.iTotalRecords = 1;
                tableResponse.month.iTotalDisplayRecords = 1;
                pushValues("month", 0, {"t": 1, "s": 1});
                //tableResponse["month"]['aaData'][0]['n']=1;
                tableResponse.month.aaData[0].uvalue = 1;
            }

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - (24 * 60 * 60 * 1000)) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 10000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
        verifyTotals("7days");
    });

    describe('check adding view(right now)', function() {
        it('adding view', function(done) {
            tableResponse.hour.iTotalRecords += 1;
            tableResponse.hour.iTotalDisplayRecords += 1;
            pushValues("hour", 0, {"u": 1, "t": 1, "s": 1, "uvalue": 1});
            pushValues("30days", 0, {"u": 1, "t": 1, "s": 1});

            tableResponse.month.iTotalRecords = 1;
            tableResponse.month.iTotalDisplayRecords = 1;
            pushValues("month", 0, {"t": 1, "s": 1});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 10) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 10000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Same user different view', function() {
        it('adding view', function(done) {
            tableResponse.hour.iTotalRecords += 1;
            tableResponse.hour.iTotalDisplayRecords += 1;
            tableResponse.yesterday.iTotalRecords += 1;
            tableResponse.yesterday.iTotalDisplayRecords += 1;
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;

            pushValues("hour", 1, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});
            pushValues("30days", 1, {"u": 1, "t": 1, "s": 1, "uvalue": 1, "n": 1});

            tableResponse.month.iTotalRecords = 2;
            tableResponse.month.iTotalDisplayRecords = 2;
            pushValues("month", 1, {"t": 1, "s": 1, "uvalue": 1, "n": 1});

            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview1", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
        verifyTotals("month");
    });

    describe('Adding some scrolling', function() {
        it('adding 2 days ago(with visit)', function(done) {

            pushValues("30days", 0, {"t": 1, "s": 1, "scr": 60, "scr-calc": 20});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600, "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 26 * 60 * 60 * 1000 * 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });
        it('adding 2 days ago(without visit)', function(done) {

            pushValues("30days", 0, {"scr": 60, "scr-calc": 10});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime - 24 * 60 * 60 * 1000 * 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('adding 1 day ago(visit, new user)', function(done) {
            pushValues("30days", 0, {"uvalue": 1, "u": 1, "n": 1, "t": 1, "s": 1, "scr": 60, "scr-calc": 6});
            pushValues("yesterday", 0, {"uvalue": 1, "u": 1, "n": 1, "t": 1, "s": 1, "scr": 60, "scr-calc": 30});
            var data = JSON.stringify([{"key": "[CLY]_action", "count": 1, "segmentation": {"name": "testview0", "type": "scroll", "height": 1000, "y": 600, "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user3" + '&timestamp=' + (myTime - 24 * 60 * 60 * 1000) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
    });
    describe('verifying totals after last update', function() {
        verifyTotals("hour");
        verifyTotals("yesterday");
        verifyTotals("30days");
    });
    describe('Adding some segments', function() {
        it('Adding platform(as segment)', function(done) {
            tableResponse["30days"].iTotalRecords += 1;
            tableResponse["30days"].iTotalDisplayRecords += 1;
            pushValues("30days", 2, {"uvalue": 1, "u": 1, "n": 1, "t": 1, "s": 1});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview2", "segment": "Android", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime + 1) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });

        it('Adding platform(as platform)', function(done) {
            pushValues("30days", 2, {"t": 1, "s": 1});
            var data = JSON.stringify([{"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview2", "platform": "IOS", "visit": 1, "start": 1}}]);
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user1" + '&timestamp=' + (myTime + 2) + '&events=' + data)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });


        });
        verifyTotals("30days");
        verifySegments({"platform": ["Android", "IOS"]});
    });

    var dataSegments = [];
    var limit = 20;
    var myList = {"platform": ["Android", "IOS"], "testSegment": []};

    describe('checking limit for segment values', function() {
        it('Adding a lot of segment values', function(done) {

            for (var i = 0; i < 20; i++) {
                dataSegments.push({"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue" + i + "", "visit": 1, "start": 1}});
                if (i < 10) {
                    myList.testSegment.push("testValue" + i + "");
                }
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify(dataSegments))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifySegments(myList);
    });
    describe('verifying segment key limit', function() {
        it('Adding 98 segments', function(done) {
            var ss = {"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue0", "visit": 1, "start": 1}};
            for (var i = 0; i < 98; i++) { //testview0 and platform already used. 98 spots left
                ss.segmentation["tS" + i] = "tV0";
                myList["tS" + i] = ["tV0"];
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify([ss]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });

        it('trying to add More', function(done) {
            var ss = {"key": "[CLY]_view", "count": 1, "segmentation": {"name": "testview0", "testSegment": "testValue0", "visit": 1, "start": 1}};
            for (var i = 0; i < 20; i++) {
                ss.segmentation["tSa" + i] = "tV0";
            }
            request
                .get('/i?app_key=' + APP_KEY + '&device_id=' + "user0" + '&timestamp=' + (myTime) + '&events=' + JSON.stringify([ss]))
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifySegments(myList);
    });
    describe('checking deleting view', function() {
        it('deleting testview0', function(done) {
            tableResponse["30days"].iTotalRecords -= 1;
            tableResponse["30days"].iTotalDisplayRecords -= 1;
            tableResponse["30days"].aaData.splice(0, 1);
            request
                .get('/i/delete_view?app_id=' + APP_ID + '&api_key=' + API_KEY_ADMIN + '&view_id=' + viewsListed[0].view)
                .expect(200)
                .end(function(err, res) {
                    if (err) {
                        console.log(err);
                    }
                    setTimeout(done, 1000 * testUtils.testScalingFactor);
                });
        });
        verifyTotals("30days");
    });
});