var fn = function () {
    'use strict';
    window.zoro = window.zoro || {};
    if (document.location.href.indexOf('fleet') === -1) {
        return;
    }

    const SHIP_TYPE_SC = 202;
    const SHIP_TYPE_LC = 203;

    window._initFleet = function () {
        var zoroPanelElement = document.getElementsByClassName('zoro-check-debris')[0];

        var element = document.createElement('button');
        element.innerHTML = "Send To Planet";
        element.setAttribute('onclick', '_sendDeployToPlanet()');
        zoroPanelElement.appendChild(element);
    }

    window._checkForFleet = function () {
        _getFleetDataWithAjax(function (dataStr) {
            var fleetElement = $(dataStr);
            var hostileEvents = fleetElement.find('.countDown span.hostile');

            if (hostileEvents.length > 0) {
                hostileEvents.each(function (index, element) {
                    element = $(element);
                    var rowElement = element.closest('tr.eventFleet');
                    var missionType = parseInt(rowElement.attr('data-mission-type'));
                    var eventId = element.attr('id').replace('counter-eventlist-', '');

                    var origin = rowElement.find('.coordsOrigin').text().replaceAll(/\n/g, '');
                    var missionTypeStr = missionType == 6 ? 'espionage' : 'attack';
                    console.log(origin);

                    _addFleetEvent(origin, eventId, missionTypeStr);
                });
            } else {
                localStorage.removeItem('fleet-events');
            }

            setTimeout(function () {
                _checkForFleet();
            }, 1000 * Math.random() + 500)
        }, function () {
            _checkForFleet();
        });
    };

    window._getFleetEvents = function () {
        var fleetStr = localStorage.getItem('fleet-events');
        if (fleetStr) {
            return JSON.parse(fleetStr);
        }

        return {}
    };

    window._addFleetEvent = function (origin, eventId, type) {
        var events = _getFleetEvents();
        var doAlert = false;
        if (!events[origin]) {
            events[origin] = {'espionage': {}, 'attack': {}};
            doAlert = true;
        }

        if (!events[origin][eventId]) {
            events[origin][eventId] = type;
            if (type != 'espionage') {
                doAlert = true;
            }
        }

        if (doAlert) {
            _addDesktopAlert('Hostile Fleet', 'We detected a hostile ' + type + ' event from ' + origin + '!', null, type == 'attack');
        }

        localStorage.setItem('fleet-events', JSON.stringify(events));
    };

    window._getFleetDataWithAjax = function (callback, lobbyCallback) {
        $.get('/game/index.php?page=componentOnly&component=eventList&ajax=1')
            .done(function (dataStr) {
                if (callback) {
                    callback(dataStr);
                }
            })
            .fail(function (xhr, status, error) {
                if (status == 'error') {
                    _handleLobbyRedirect(lobbyCallback);
                }
            });
    }

    window._sendDeployToPlanet = function () {
        // Mission 4
        // sendShips(8, galaxy, system, planet, 1, shipCount);
        // fleetDispatcher.planets

        var count = _getMaxShipCount(SHIP_TYPE_SC);
        if (count > 0) {
            var params = _prepareSendFleetParams(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_DEPLOY);
            params['am' + SHIP_TYPE_SC] = count;

            $.post('/game/index.php?page=ingame&component=fleetdispatch&action=sendFleet&ajax=1&asJson=1', params);
        } else {
            alert('No ship to send.')
        }
    }

    window._prepareSendFleetParams = function (type, mission) {
        return {
            token: fleetDispatcher.fleetSendingToken,
            galaxy: window.currentPlanet.galaxy,
            system: window.currentPlanet.system,
            position: window.currentPlanet.position,
            type: type,
            metal: 0,
            crystal: 0,
            deuterium: 0,
            prioMetal: 1,
            prioCrystal: 2,
            prioDeuterium: 3,
            mission: mission,
            speed: 10,
            retreatAfterDefenderRetreat: 0,
            union: 0,
            holdingtime: 0
        };
    }

    window._getMaxShipCount = function (shipType) {
        var result = 0;
        fleetDispatcher.shipsOnPlanet.forEach(function (item) {
            if (item.id === shipType) {
                result = item.number;
            }
        });

        return result;
    }

    _initFleet();
    var autoCheckFleet = _getUrlParameter('check-fleet');
    if (autoCheckFleet) {
        _checkForFleet();
    }
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);

// COLONIZATION_ENABLED: true
// DONUT_GALAXY: 1
// DONUT_SYSTEM: 1
// EXPEDITION_POSITION: 16
// FLEET_DEUTERIUM_SAVE_FACTOR: 0.5
// MAX_GALAXY: 9
// MAX_NUMBER_OF_PLANETS: 12
// MAX_POSITION: 16
// MAX_SYSTEM: 499
// MISSION_ATTACK: 1
// MISSION_COLONIZE: 7
// MISSION_DEPLOY: 4
// MISSION_DESTROY: 9
// MISSION_ESPIONAGE: 6
// MISSION_EXPEDITION: 15
// MISSION_HOLD: 5
// MISSION_MISSILEATTACK: 10
// MISSION_NONE: 0
// MISSION_RECYCLE: 8
// MISSION_TRANSPORT: 3
// MISSION_UNIONATTACK: 2
// PLANETTYPE_DEBRIS: 2
// PLANETTYPE_MOON: 3
// PLANETTYPE_PLANET: 1
// PLAYER_ID_LEGOR: 1
// PLAYER_ID_SPACE: 99999
// SPEEDFAKTOR_FLEET: 4