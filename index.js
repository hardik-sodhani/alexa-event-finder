var Alexa = require('alexa-sdk');
var http = require('http');
var https = require('https');


var client_id =  'NjY3ODUzOHwxNDg1MTg3ODc1';
var cityName = "";
var urlCityName = "";
var venueID = "";
var venueName = "";
var urlVenueName;
var eventTitle = "";
var eventNameRequest = "";
var eventDate = "";
var eventType = "";
var eventPrice = "";
var output = "";
var alexa;
var i = 0;
var index = 1;
var counter = 0;
var nextThree;
var tempVenueName;
var ampTitle;
var venueData = {};
var eventData = {};
var venueArray = [];
var breakException;

var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
    ];
var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];



var states = {
    VENUEMODE: '_VENUEMODE',
};

var welcomeMessage = "Welcome to event finder! Please say the name of a city to find venues with ongoing events in the area. Or, please say the name of a venue, followed by the city its located in, to hear the ongoing events for that venue.";
var welcomeReprompt = "Im sorry I didnt catch that. Please say the name of a city to find venues with ongoing events in the area. ";
var venueIntro = "";
var eventIntro = "";
var moreVenueReprompt = "Sorry, I didnt quite get that. Please say the name of a venue to hear about events taking place there, or say: more venues, to hear more options. ";
var moreEventReprompt = "Could you please repeat that? Please say the name of an event for more details.";
var noFurtherVenues = "There are no more venues in this city. To repeat the list of venues, please say: repeat, venues. Or, please say the name of a new city to listen to a different list of venues.";
var noFurtherEvents = "There are no more events at this venue. To repeat the list of events, please say: repeat, events. Or, please say the name of a new city.";
var missingVenueAndEvent = "Please try again. Say one of the following: a venue name, followed by a city; or the name of a city for a list of venues at that location.";
var missingVenueAndEventReprompt = "You did not mention a city location. Say one of the following: a venue name, followed by a city; or the name of a city for a list of venues at that location.";

exports.handler = function(event, context, callback) {
    alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers, venueModeHandlers, eventModeHandlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function() {
        this.handler.state = states.VENUEMODE;
        this.emit(':ask', welcomeMessage, welcomeReprompt);
    },
    'getVenueIntent': function() {
        this.handler.state = states.VENUEMODE;
        this.emitWithState('getVenueIntent');
    },
    'moreVenuesIntent': function() {
        this.handler.state = states.VENUEMODE;
        this.emitWithState('moreVenuesIntent');
    },
    'getEventIntent': function() {
        this.handler.state = states.VENUEMODE;
        this.emitWithState('getEventIntent');
    },
    'getVenueAndEventIntent': function() {
        this.handler.state = states.VENUEMODE;
        this.emitWithState('getVenueAndEventIntent');
    },
    'moreEventsIntent': function() {
        this.handler.state = states.EVENTMODE;
        this.emitWithState('moreEventsIntent');
    },
    'eventDetailsIntent': function() {
        this.handler.state = states.EVENTMODE;
        this.emitWithState('moreEventsIntent');
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t get that. Please repeat your response.', 'Please repeat your response.');
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.emit(':saveState', true);
    }
};

var venueModeHandlers = Alexa.CreateStateHandler(states.VENUEMODE, {
    'getVenueIntent': function() {
        cityName = this.event.request.intent.slots.cityName.value;
        urlCityName = cityName.replace(/\s/g, "%20");
        output = "";
        index = 1;
        counter = 0;
        var options = {
            host: "api.seatgeek.com",
            path: '/2/venues?city=' + urlCityName + '&client_id=' + client_id,
            method: 'GET'
        };
        httpGet(options, function(response) {
            var responseData = JSON.parse(response);
            venueData = responseData;
            if(responseData === null) {
                console.log("There was a problem with getting the data, please try again.");
            }
            else {
                output += "Here are some venues with ongoing events in " + cityName + ". Please say the name of a venue to hear the events taking place there, or say: more, venues, to hear more options. ";
                
                while (counter < 3) {
                    venueName = responseData.venues[counter].name;
                    venueName = ampersandCheck(venueName);
                    output += "Venue " + index + ": " + venueName + ". ";
                    index++;
                    counter++;
                }
            }
            alexa.emit(':ask', output, moreVenueReprompt);
        });
    },
    'moreVenuesIntent': function() {
        output = "";
        if (counter >= venueData.venues.length) {
            output += noFurtherVenues;
            alexa.emit(':ask', output, moreVenueReprompt);
        }
        else {
            nextThree = counter + 3;
            for (; counter < nextThree; counter++) {
                if (counter >= venueData.venues.length) {
                    break;
                }
                output += "Venue " + index + ": " + venueData.venues[counter].name + ". ";
                index++;
            }
        }
        alexa.emit(':ask', output, moreVenueReprompt);
    },
    'getEventIntent': function() {
        var checkName = true;
        output = "";
        index = 1;
        counter = 0;
        venueName = this.event.request.intent.slots.venueName.value;

        for (var j = 0; j < venueData.venues.length; j++) {
            if (venueName.toLowerCase() !== venueData.venues[j].name.toLowerCase()) {
                checkName = false;
            }
            else {
                checkName = true;
                break;
            }
        }

        if (!checkName) {
            output += "I did not hear a city name. Please say the venue name followed by the city name to find ongoing events.";
            alexa.emit(':ask', output, output);
        }

        venueArray = venueData.venues;

        try {
            venueArray.forEach( function(arrayItem) {
                if (arrayItem.name.toLowerCase() === venueName.toLowerCase()) {
                    venueID = arrayItem.id;
                    throw breakException;
                }
            });  
        } catch(e) {
            if (e !== breakException) {
                throw e;
            }
        }

        var options = {
            host: "api.seatgeek.com",
            path: '/2/events?venue.id=' + venueID + '&client_id=' + client_id,
            method: 'GET'
        };
        httpGet(options, function(response) {
            var responseData = JSON.parse(response);
            eventData = responseData;
            if(responseData === null) {
                console.log("There was a problem with getting the data, please try again.");
            }
            else if (responseData.events === null || responseData.events.length <= 0 ) {
                venueName = ampersandCheck(venueName);
                output += "There are currently no events going on at " + venueName + ". Please select a different venue. ";
                alexa.emit(':ask', output, output);

            }
            else {
                venueName = ampersandCheck(venueName);
                eventIntro = "Here are current events happening at " + venueName + ". Please say: more, events, to listen to more options. ";
                output += eventIntro;

                while (counter < 3) {
                    eventTitle = responseData.events[counter].title;
                    eventTitle = ampersandCheck(eventTitle);
                    output += "Event " + index + ": " + eventTitle + ". ";
                    index++;
                    counter++;
                }
            }
            alexa.emit(':ask', output, moreEventReprompt);
        });
    },
    'getVenueAndEventIntent': function() { //display events for a given venue at a given city
        var fixedVenueName;
        var responseData = {};
        output = "";
        venueArray = [];
        venueData = {};
        index = 1;
        counter = 0;
        cityName = this.event.request.intent.slots.cityName.value;
        urlCityName = cityName.replace(/\s/g, "%20");
        venueName = this.event.request.intent.slots.venueName.value;
        urlVenueName = venueName.replace(/\s/g, "%20");

        if (cityName === null || venueName === null) {
            output += missingVenueAndEvent;
            alexa.emit(':ask', output, missingVenueAndEventReprompt);
        }
        
        var options = {
            host: "api.seatgeek.com",
            path: '/2/venues?city=' + urlCityName + '&q=' + urlVenueName + '&client_id=' + client_id,
            method: 'GET'
        };

        httpGet(options, function(response) {
            responseData = JSON.parse(response);
            venueData = responseData;
            venueArray = responseData.venues;

            if (responseData === null) {
                output += "There was a problem with getting the data, please try again.";
                alexa.emit(':tell', output);
            }
            else if (venueArray.length > 1 && venueArray[0].name.toLowerCase() !== venueName.toLowerCase()) {
                output += "There are multiple venues with that name in " + cityName + ". Please specify which venue you would like to select. ";
                venueArray.forEach( function(arrayItem) {
                    fixedVenueName = ampersandCheck(arrayItem.name);
                    output += "Venue " + index + ": " + fixedVenueName + ". ";
                    index++;
                });
                alexa.emit(':ask', output, output);
            }
            else {
                venueID = venueArray[0].id;
                options = {
                    host: "api.seatgeek.com",
                    path: '/2/events?venue.id=' + venueID + '&client_id=' + client_id,
                    method: 'GET'
                };

                httpGet(options, function(response) {
                    var responseData = JSON.parse(response);
                    eventData = responseData;
                    if(responseData === null) {
                        console.log("There was a problem with getting the data, please try again.");
                    }
                    else if (responseData.events === null || responseData.events.length <= 0 ) {
                        venueName = ampersandCheck(venueName);
                        output += "There are currently no events going on at " + venueName + ". Please select a different venue. ";
                        alexa.emit(':ask', output, output);

                    }
                    else {
                        venueName = ampersandCheck(venueName);
                        eventIntro = "Here are current events happening at " + venueName + ". Please say: more, events, to listen to more options. ";
                        output += eventIntro;

                        while (counter < 3) {
                            eventTitle = responseData.events[counter].title;
                            eventTitle = ampersandCheck(eventTitle);
                            output += "Event " + index + ": " + eventTitle + ". ";
                            index++;
                            counter++;
                        }
                    }
                    alexa.emit(':ask', output, moreEventReprompt);
                });
            }
        });
    },
    'moreEventsIntent': function() {
        output = "";
        if (counter >= eventData.events.length) {
            output += noFurtherEvents;
            alexa.emit(':ask', output, moreEventReprompt);
        }
        else {
            nextThree = counter + 3;
            for (; counter < nextThree; counter++) {
                if (counter >= eventData.events.length) {
                    break;
                }
                output += "Event " + index + ": " + eventData.events[counter].title + ". ";
                index++;
            }
        }
        alexa.emit(':ask', output, moreEventReprompt);
    },
    'eventDetailsIntent': function() {
        output = "";
        var eventObject;

        eventNameRequest = this.event.request.intent.slots.eventName.value;
        eventObject = checkEventExists(eventData, eventNameRequest);

        var eventDateObj = new Date(eventObject.datetime_local);
        var eventDay = eventDateObj.getDate();
        var dayOfTheWeek = dayNames[eventDateObj.getDay()];

        eventDate = monthNames[eventDateObj.getMonth()];
        eventType = eventObject.type;
        eventPrice = eventObject.stats.lowest_price;

        output += eventNameRequest + " is a " + eventType + " scheduled for " + dayOfTheWeek + " " + eventDate + " " + eventDay + ". Prices for this event start at " + eventPrice + " dollars. For further information, please take a look at the event card in the Alexa app."; 
        alexa.emit(':ask', output, output);
    }
});

//helperFunctions

function httpGet(options, callback) {
    console.log("IN GET HELPER");
    var req = http.request(options, (res) => {
        var body = '';

        //for URL redirect issue
        if(res.statusCode == 301) {
            https.get(res.headers.location, function(res) {
                res.on('data', (d) => {
                    body += d;
                });

                res.on('end', function () {
                    callback(body);
                });

                req.on('error', (e) => {
                    console.error(e);
                });
            });
        }
        else {
            res.on('data', (d) => {
                body += d;
            });

            res.on('end', function () {
                callback(body);
            });

            req.on('error', (e) => {
                console.error(e);
            });
        }
    });

    req.end();
}

function ampersandCheck (checkString) {
    var temp = checkString.split(" ");

    checkString = temp.map((char) => {
        if (char.includes("&")) {
            var newString = char.split("");
            char = newString.map( (str) => str === "&" ? " and " :  str ).join(" ");
            return char;
        }
        else {
            return char;
        }
    }).join(" ");

    return checkString;
}

function checkEventExists(eventData, eventName) {
    var tempString = "";
    var eventObj;
    for (var i = 0; i < eventData.events.length; i++) {
        if (eventData.events[i].title.toLowerCase().includes(eventName.toLowerCase())) {
            eventObj = eventData.events[i];
            return eventObj;
        }
        tempString = eventData.events[i].title.split(" ");

        for (var j = 0; j < tempString.length; j++) {
            if (tempString[j].toLowerCase().includes(eventName.toLowerCase())) {
                eventObj = eventData.events[i];
                return eventObj;
            }
        }
    }
}