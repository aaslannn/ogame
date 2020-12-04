var fn = function () {
    'use strict';
    window.zoro = window.zoro || {};
    if (document.location.href.indexOf('fleet') === -1) {
        return;
    }

    const SHIP_TYPE_SC = 202;
    const SHIP_TYPE_LC = 203;

    const MIN_DEU_TO_KEEP_AT_MOON = 3000000;

    window._initFleet = function () {
        var zoroPanelElement = document.getElementsByClassName('zoro-check-debris')[0];

        var zoroFleetElement = document.createElement('div');
        zoroPanelElement.appendChild(zoroFleetElement);

        if (fleetDispatcher.currentPlanet.type === fleetDispatcher.fleetHelper.PLANETTYPE_PLANET) {
            var element = document.createElement('button');
            element.innerHTML = "Deploy all resources To Moon";
            element.setAttribute('onclick', '_sendCarriers(fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_DEPLOY, true)');
            zoroFleetElement.appendChild(element);

            element = document.createElement('button');
            element.innerHTML = "Deploy All Ships To Moon";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_DEPLOY, false)');
            zoroFleetElement.appendChild(element);

            element = document.createElement('button');
            element.innerHTML = "Deploy ships&resources To Moon";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_DEPLOY, true)');
            zoroFleetElement.appendChild(element);

            element = document.createElement('button');
            element.innerHTML = "Transport All Ships To Moon";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_TRANSPORT, false)');
            zoroFleetElement.appendChild(element);

            element = document.createElement('button');
            element.innerHTML = "Transport ships&resources To Moon";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_TRANSPORT, true)');
            zoroFleetElement.appendChild(element);
        } else {
            var element = document.createElement('button');
            element.innerHTML = "Deploy Carriers To Planet";
            element.setAttribute('onclick', '_sendCarriers(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_DEPLOY)');
            zoroFleetElement.appendChild(element);

            var element = document.createElement('button');
            element.innerHTML = "Deploy ships To Planet";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_DEPLOY, false)');
            zoroFleetElement.appendChild(element);

            var element = document.createElement('button');
            element.innerHTML = "Deploy ships&resources To Planet";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_DEPLOY, true)');
            zoroFleetElement.appendChild(element);

            var element = document.createElement('button');
            element.innerHTML = "Transport Resources To Planet";
            element.setAttribute('onclick', '_sendCarriers(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_TRANSPORT, true)');
            zoroFleetElement.appendChild(element);

            var element = document.createElement('button');
            element.innerHTML = "Transport All Ships To Planet";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_TRANSPORT, false)');
            zoroFleetElement.appendChild(element);

            var element = document.createElement('button');
            element.innerHTML = "Transport Ships&Resources To Planet";
            element.setAttribute('onclick', '_sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_TRANSPORT, true)');
            zoroFleetElement.appendChild(element);
        }

        var element = document.createElement('button');
        element.innerHTML = "Send Expedition";
        element.setAttribute('onclick', '_sendExpedition()');
        zoroFleetElement.appendChild(element);


    }

    window._checkForFleet = function () {
        $('#pageContent').hide();
        _setFleetLastTime();

        _getFleetDataWithAjax(function (dataStr) {
            var fleetElement = $(dataStr);
            var hostileEvents = fleetElement.find('.countDown span.hostile');

            if (hostileEvents.length > 0) {
                hostileEvents.each(function (index, element) {
                    element = $(element);
                    var rowElement = element.closest('tr.eventFleet');
                    var missionType = parseInt(rowElement.attr('data-mission-type'));
                    var eventId = element.attr('id').replace('counter-eventlist-', '');

                    var origin = rowElement.find('.coordsOrigin').text().replaceAll(/(\r\n|\n|\s)/gm, '');
                    var dest = rowElement.find('.destCoords').text().replaceAll(/(\r\n|\n|\s)/gm, '');
                    var planetType = rowElement.find('.originFleet .moon').length == 1 ? 3 : 1;
                    var missionTypeStr = missionType == 6 ? 'espionage' : 'attack';

                    _addFleetEvent(origin, dest, eventId, missionTypeStr, planetType);
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

    window._addFleetEvent = function (origin, dest, eventId, type, planetType) {
        var events = _getFleetEvents();
        var doAlert = type != 'espionage';
        if (!events[origin]) {
            events[origin] = {'espionage': {}, 'attack': {}, 'silent': false};
            doAlert = true;
        }

        if (!events[origin][eventId]) {
            events[origin][eventId] = type;
            if (type != 'espionage') {
                doAlert = true;
            }
        }

        var destCoords = dest.replace(']', '').replace('[', '').split(':');
        let mainFleetPlanet = _getMainFleetPlanet();
        console.log('We detected an attack!' + origin + '_' + dest);
        var alertHeader = 'Hostile Fleet';
        if (type == 'espionage' && _checkLastWarned('recently_escaped' + dest, 30000)) {
            if (mainFleetPlanet.galaxy == destCoords[0] && mainFleetPlanet.system == destCoords[1] && mainFleetPlanet.type == planetType) {
                _openMainFleetPage('&emergency-escape=1');
                alertHeader += ' Emergency Escaped';
            } else if (_getLastFleetCount(destCoords[0], destCoords[1], destCoords[2], planetType) > 30000) {
                _openFleetPage(destCoords[0], destCoords[1], destCoords[2], planetType, '&emergency-escape=1')
            }
        }

        if (doAlert && _checkLastWarned('attack_alert_' + origin, 30000)) {
            var message = _getPlanetName(destCoords[0], destCoords[1], destCoords[2]).toUpperCase() + ': ' + type.toUpperCase() + ' event from ' + origin + '!';
            _addDesktopAlert(alertHeader, message, null, true, type == 'attack' ? 1 : 0);
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

    window._sendCarriers = function (planetType, mission, includeResources) {
        var countSC = _getMaxShipCount(SHIP_TYPE_SC);
        var countLC = _getMaxShipCount(SHIP_TYPE_LC);
        if (countSC > 0 || countLC > 0) {
            var params = _prepareSendFleetParams(planetType, mission);
            if (countSC > 0) {
                params['am' + SHIP_TYPE_SC] = countSC;
            }
            if (countLC > 0) {
                params['am' + SHIP_TYPE_LC] = countLC;
            }

            if (includeResources) {
                var loadedAll = _loadResourceToShips(params, true, currentPlanet.type === fleetDispatcher.fleetHelper.PLANETTYPE_MOON);
                if (!loadedAll && mission != fleetDispatcher.fleetHelper.MISSION_TRANSPORT) {
                    params.mission = fleetDispatcher.fleetHelper.MISSION_TRANSPORT;
                }
            }

            _sendShipsWithParams(params);
        } else {
            alert('No ship to send.')
        }
    }

    window._sendShipsWithParams = function (params) {
        $.post('/game/index.php?page=ingame&component=fleetdispatch&action=sendFleet&ajax=1&asJson=1', params)
            .done(function (dataStr) {
                var data = JSON.parse(dataStr);
                if (!data.success) {
                    alert(data.errors[0].message);
                } else {
                    window.location.reload();
                }
            });
    }

    window._sendAllShips = function (planetType, mission, includeResources) {
        var params = _prepareSendFleetParams(planetType, mission);
        fleetDispatcher.shipsOnPlanet.forEach(function (ship) {
            params['am' + ship.id] = ship.number;
        });

        if (includeResources) {
            _loadResourceToShips(params, false, currentPlanet.type === fleetDispatcher.fleetHelper.PLANETTYPE_MOON);
        }
        _sendShipsWithParams(params);
    }

    window._loadResourceToShips = function (shipsSetParams, notifyForRemainingResources, keepMinDeu) {
        var totalCapacity = 0;
        Object.keys(shipsSetParams).forEach(function (key) {
            if (key.indexOf('am') === 0) {
                totalCapacity += _getCargoCapacity(parseInt(key.replace('am', ''))) * shipsSetParams[key];
            }
        });

        var crystal = fleetDispatcher.crystalOnPlanet;
        var deu = fleetDispatcher.deuteriumOnPlanet;
        var metal = fleetDispatcher.metalOnPlanet;
        if (keepMinDeu) {
            deu = deu > MIN_DEU_TO_KEEP_AT_MOON ? deu - MIN_DEU_TO_KEEP_AT_MOON : 0;
        }

        if (totalCapacity < crystal + deu + metal) {
            if (metal > totalCapacity) {
                shipsSetParams.metal = totalCapacity;
                shipsSetParams.crystal = 0;
                shipsSetParams.deuterium = 0;
            } else if (metal + crystal > totalCapacity) {
                shipsSetParams.metal = metal;
                shipsSetParams.crystal = totalCapacity - metal;
                shipsSetParams.deuterium = 0;
            } else {
                shipsSetParams.metal = metal;
                shipsSetParams.crystal = crystal;
                shipsSetParams.deuterium = totalCapacity - metal - crystal;
            }
            if (notifyForRemainingResources) {
                alert('Ship capacity is lower than existing resources, doing transport, please do send fleet again.');
            }
            return false;
        } else {
            shipsSetParams.metal = metal;
            shipsSetParams.crystal = crystal;
            shipsSetParams.deuterium = deu;

            return true;
        }
    }

    window._getCargoCapacity = function (type) {
        return fleetDispatcher.fleetHelper.shipsData[type].cargoCapacity;
    };

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

    window._getCurrentPlanetFleetCount = function () {
        var fleetCount = 0;
        window.fleetDispatcher.shipsOnPlanet.forEach(function (ship) {
            fleetCount += ship.number;
        })

        return fleetCount;
    }

    window._checkMainFleet = function () {
        if (_getCurrentPlanetFleetCount() > 50000) {
            localStorage.setItem('main_fleet', JSON.stringify(currentPlanet));
        }
    }

    window._setLastFleetCount = function () {
        localStorage.setItem('fleet_count_' + _getCoordStr(currentPlanet.galaxy, currentPlanet.system, currentPlanet.position) + '_' + currentPlanet.type, _getCurrentPlanetFleetCount());
    }

    window._escapeFleet = function () {
        _checkTarget()
            .done(function (dataStr) {
                console.log('Fleet escape requested!');
                var data = JSON.parse(dataStr);
                if (data.status == 'success' && data.targetOk) {
                    console.log('Decided to debris remove!');
                    _sendAllShips(fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS, fleetDispatcher.fleetHelper.MISSION_RECYCLE);
                    setInterval(function () {
                        var activeEvents = localStorage.getItem('fleet-events');
                        if (!activeEvents) {
                            var events = _getActiveEvents();

                            window.close();
                        }
                    }, 20000)
                } else {
                    console.log('Decided to transport!');
                    _sendAllShips(currentPlanetType == fleetDispatcher.fleetHelper.PLANETTYPE_MOON ? fleetDispatcher.fleetHelper.PLANETTYPE_PLANET : fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_TRANSPORT)
                    window.close();
                }
            })
            .fail(function () {
                console.log('Decided to transport!');
                _sendAllShips(currentPlanetType == fleetDispatcher.fleetHelper.PLANETTYPE_MOON ? fleetDispatcher.fleetHelper.PLANETTYPE_PLANET : fleetDispatcher.fleetHelper.PLANETTYPE_MOON, fleetDispatcher.fleetHelper.MISSION_TRANSPORT)
                window.close();
            });
    }

    window._checkTarget = function () {
        return $.post('/game/index.php?page=ingame&component=fleetdispatch&action=checkTarget&ajax=1&asJson=1', {am209: 1, galaxy: currentPlanet.galaxy, system: currentPlanet.system, position: currentPlanet.position, type: 2, union: 0});
    }

    window._sendExpedition = function () {
        var randValue = Math.random();
        var fleetId = randValue < 0.33 ? 614 : (randValue < 0.66 ? 1296 : 1297);
        fleetDispatcher.standardFleets.forEach(function (fleet) {
            if (fleet.id == fleetId) {
                var params = _prepareSendFleetParams(fleetDispatcher.fleetHelper.PLANETTYPE_PLANET, fleetDispatcher.fleetHelper.MISSION_EXPEDITION);
                params.position = 16;
                params.holdingtime = 1;
                for (var shipId in fleet.ships) {
                    let countOfShips = fleet.ships[shipId];
                    if (countOfShips > 0) {
                        params['am' + shipId] = countOfShips;
                    }
                }
                _sendShipsWithParams(params);
            }
        })
    }

    if (window.fleetDispatcher) {
        _initFleet();
        setTimeout(function () {
            _refreshPlanets();
        }, 1000);
        _checkMainFleet();
        _setLastFleetCount();
    }
    var autoCheckFleet = _getUrlParameter('check-fleet');
    if (autoCheckFleet) {
        _checkForFleet();
    }

    var emergencyEscape = _getUrlParameter('emergency-escape');
    if (emergencyEscape) {
        setTimeout(function () {
            if (_getCurrentPlanetFleetCount() > 30000) {
                _escapeFleet();
            } else {
                console.log('Not escaping as no major fleet is here');
            }
        }, 2000)
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