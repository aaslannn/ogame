var fn = function () {
    'use strict';
    if (document.location.href.indexOf('galaxy') === -1) {
        return;
    }

    var self = window;
    window.zoro = window.zoro || {};
    const MILLION = 1000000;
    const DEBRIS_ALERT_THRESHOLD = 2 * MILLION;
    const PUSH_ALERT_THRESHOLD = 2 * MILLION;
    const DEBRIS_RERUN_DELAY = 10000;
    const DEBRIS_RUN_NEXT_SYSTEM_DELAY = 100;
    const AJAX_CALL_CONCURRENCY = 6;

    zoro.galaxySystemMap.forEach(function (galaxySystem) {
        zoro.debrisCheckStatus[galaxySystem[0], galaxySystem[1], galaxySystem[2]] = window._getDebrisCheck(galaxySystem[0], galaxySystem[1], galaxySystem[2]);
    });

    window._initGalaxy = function () {
        var goToNearestDivElement = document.createElement('div');

        var checkDebrisElement = document.createElement('span');
        checkDebrisElement.className = "galaxy_icons prev";
        checkDebrisElement.style = 'float: left;';
        checkDebrisElement.setAttribute('onclick', '_goToNearestInactiveSystem(-1)');
        goToNearestDivElement.appendChild(checkDebrisElement);

        checkDebrisElement = document.createElement('span');
        checkDebrisElement.className = "galaxy_icons next";
        checkDebrisElement.style = 'float: right;';
        checkDebrisElement.setAttribute('onclick', '_goToNearestInactiveSystem(1)');
        goToNearestDivElement.appendChild(checkDebrisElement);

        $('#middle').first().append(goToNearestDivElement);
    };

    window._applyColors = function (metalValue, kristalValue, zoroElement, coloredElement) {
        var max = Math.max(metalValue, kristalValue);
        var clazz = _calculateColorRed(max, 1 * MILLION, 5, 10);
        if (clazz) {
            zoroElement.addClass('zoro-color');
            coloredElement.addClass(clazz);
        }
    };

    window._checkExpeditionDebris = function () {
        var metalElement = $('.uv-galaxy-expo-debris .debris-content').first();
        var kristalElement = $('.uv-galaxy-expo-debris .debris-content').last();

        var coloredElement = $('.uv-element.uv-galaxy-expo-debris');
        if (metalElement && metalElement.text()) {
            var metalValue = window._toNumber(metalElement.text().split(':')[1]);
            var kristalValue = window._toNumber(kristalElement.text().split(':')[1]);

            window._applyColors(metalValue, kristalValue, coloredElement, coloredElement);
        }
    };

    window._checkGalaxyDebris = function () {
        var galaxyDebrisElements = $('.uv-galaxy-debris:not(.zoro-color)');

        if (galaxyDebrisElements && galaxyDebrisElements.length > 0) {
            galaxyDebrisElements.each(function (index, debrisElement) {
                debrisElement = $(debrisElement);
                var subFields = debrisElement.find('div:not(.debrisField)');
                if (subFields.length > 0) {
                    var metalElement = subFields.first();
                    var krisalElement = subFields.last();

                    var metalStr = metalElement.text().split(' ');
                    var kristalStr = krisalElement.text().split(' ');

                    var metalValue = _toNumber(metalStr[0]);
                    var kristalValue = _toNumber(kristalStr[0]);

                    if (metalValue != 0) {
                        metalValue *= (metalStr[1] == 'K' ? 1000 : (metalStr[1] == 'M' ? 1000000 : 1))
                    }

                    if (kristalValue != 0) {
                        kristalValue *= (kristalStr[1] == 'K' ? 1000 : (kristalStr[1] == 'M' ? 1000000 : 1))
                    }

                    window._applyColors(metalValue, kristalValue, debrisElement, subFields);
                }
            });
        }
    };

    window._processFoundDebris = function (galaxy, system, metal, kristal, recyclerValue, planet) {
        var result = _addLargeDebris(galaxy, system, planet, metal, kristal, recyclerValue);

        if (result) {
            var message = galaxy + ':' + system + ':' + planet + ' , ' + parseInt(metal / 1000) + 'K metal, ' + parseInt(kristal / 1000) + 'K kristal!';
            var sendNotif = (planet == 16 && metal + kristal > PUSH_ALERT_THRESHOLD) || (_isNearToMyPlanets(galaxy, system, 10) && metal + kristal > PUSH_ALERT_THRESHOLD * 10);

            _addDesktopAlert('OGame Large Debris Found', message, _getGalaxyUrl(galaxy, system), sendNotif, 0, _isNearToMyPlanets(galaxy, system) ? 'cashregister' : null);
        }
    };

    window._addGalaxyDebrisInterval = function _addGalaxyDebrisInterval() {
        var self = window;

        setInterval(function () {
            self._checkExpeditionDebris();
            self._checkGalaxyDebris();
        }, 100);
    };

    window._checkDebrisThroughGalaxy = function (galaxy, startSystem, endSystem, rerun) {
        startSystem = parseInt(startSystem);
        var debrisStatus = {
            galaxy: galaxy,
            currentSystem: startSystem,
            startSystem: startSystem,
            endSystem: endSystem,
            runningDebris: true,
            lastTime: new Date().getTime(),
            foundDebrisCount: 0
        };
        zoro.debrisCheckStatus[galaxy + ':' + startSystem + ':' + endSystem] = debrisStatus;
        _storeDebrisCheck(debrisStatus);
        console.log('Lets check debris at galaxy ' + galaxy + ' for system range ' + startSystem + '-' + endSystem + ' : ' + JSON.stringify(_getDebrisCheck(debrisStatus.galaxy, debrisStatus.startSystem, debrisStatus.endSystem)));

        _checkDebrisThroughGalaxyRecursive(debrisStatus, rerun);
    };

    window._checkDebrisThroughGalaxyRecursive = function (debrisStatus, rerun) {
        if (debrisStatus.currentSystem >= debrisStatus.endSystem + 1) { // We have completed galaxy well done
            var message = 'Completed to check galaxy ' + debrisStatus.galaxy + ' debris and ' + debrisStatus.foundDebrisCount + ' found ' + ' in ' + (new Date().getTime() - debrisStatus.lastTime) / 1000 + ' sec.';
            if (rerun) {
                console.log(message);
                setTimeout(function () {
                    _checkDebrisThroughGalaxy(debrisStatus.galaxy, debrisStatus.startSystem, debrisStatus.endSystem, rerun)
                }, DEBRIS_RERUN_DELAY * Math.random() + (DEBRIS_RERUN_DELAY / 2));
            } else {
                _addDesktopAlert('Debris Check Completed', message);
            }
        } else if (!_getDebrisCheck(debrisStatus.galaxy, debrisStatus.startSystem, debrisStatus.endSystem).runningDebris) {
            console.log('Debris check stopped at system ' + debrisStatus.currentSystem + ' with found debris count ' + debrisStatus.foundDebrisCount + ' in ' + (new Date().getTime() - debrisStatus.lastTime) / 1000 + ' sec.');
        } else {
            _getGalaxyDataWithAjax(debrisStatus.galaxy, debrisStatus.currentSystem, function (data) {
                _checkAjaxExpeditionContent(data, debrisStatus.galaxy, debrisStatus.currentSystem, debrisStatus);
                _checkAjaxPlanetDebrisContent(data, debrisStatus.galaxy, debrisStatus.currentSystem, debrisStatus);

                setTimeout(function () {
                    debrisStatus.currentSystem++;
                    _storeDebrisCheck(debrisStatus);
                    _checkDebrisThroughGalaxyRecursive(debrisStatus, rerun);
                }, Math.random() * DEBRIS_RUN_NEXT_SYSTEM_DELAY);
            }, function () {
                _continueDebrisCheck();
            });
        }
    };

    window._getGalaxyDataWithAjax = function (galaxy, system, callback, lobbyCallback) {
        $.post('/game/index.php?page=ingame&component=galaxyContent&ajax=1', {galaxy: galaxy, system: system})
            .done(function (dataStr) {
                var data = JSON.parse(dataStr);
                if (callback) {
                    callback(data);
                }
            })
            .fail(function (xhr, status, error) {
                if (status == 'error') {
                    _handleLobbyRedirect(lobbyCallback);
                }
            });
    }

    window._continueDebrisCheck = function () {
        zoro.galaxySystemMap.forEach(function (galaxySystem) {
            let debrisStatus = _getDebrisCheck(galaxySystem[0], galaxySystem[1], galaxySystem[2]);

            console.log('Starting debris check for ' + galaxySystem[0] + ':' + galaxySystem[1] + '-' + galaxySystem[2] + ' at ' + (new Date().getTime() - debrisStatus.lastTime) + ' ------ ' + JSON.stringify(debrisStatus));
            if (!debrisStatus.lastTime || debrisStatus.runningDebris) {
                if (new Date().getTime() - debrisStatus.lastTime > 900000) { // If more than 15 minutes past after last run, start from scratch
                    _checkDebrisThroughGalaxy(galaxySystem[0], galaxySystem[1], galaxySystem[2], true)
                } else {
                    _checkDebrisThroughGalaxyRecursive(debrisStatus, true);
                }
            }
        });
    };

    window._checkPotentialDebrisCoords = function (concurrency = 1) {
        var potentialDebrisCheck = _getPotentialDebrisCheck();
        potentialDebrisCheck.lastTime = new Date().getTime();
        _storePotentialDebrisCheck(potentialDebrisCheck);

        for (var index = 0; index < Math.min(potentialDebrisCheck.potentials.length, concurrency); index++) {
            _checkPotentialDebrisCoordsRecursive(index, index, concurrency);
        }
    };

    window._checkPotentialDebrisCoordsRecursive = function (index = 0, startIndex, concurrency = 1) {
        var potentialDebrisCheck = _getPotentialDebrisCheck();
        if (index >= potentialDebrisCheck.potentials.length) {
            if (startIndex == 0) {
                setTimeout(function () {
                    _checkPotentialDebrisCoords(concurrency);
                }, Math.random() * DEBRIS_RERUN_DELAY / 2);
                console.log('We completed potentials check in ' + ((new Date().getTime() - potentialDebrisCheck.lastTime) / 1000) + ' sec!')
            }
        } else {
            var galaxy = potentialDebrisCheck.potentials[index].galaxy;
            var system = potentialDebrisCheck.potentials[index].system;

            _getGalaxyDataWithAjax(galaxy, system, function (data) {
                var found = _checkAjaxExpeditionContent(data, galaxy, system);
                if (found) {
                    _updatePotentialDebrisItem(galaxy, system);
                }

                setTimeout(function () {
                    _checkPotentialDebrisCoordsRecursive(index + concurrency, startIndex, concurrency);
                }, Math.random() * DEBRIS_RUN_NEXT_SYSTEM_DELAY / 2);
            }, function () {
                console.log('We restored back from lobby check for startIndex ' + startIndex);
                _checkPotentialDebrisCoords(concurrency);
            });
        }
    };

    window._checkAjaxPlanetDebrisContent = function (data, galaxy, system, debrisStatus) {
        var planetDebrises = $(data.galaxy).find('td.debris .galaxyTooltip .ListLinks');
        var found = false;
        if (planetDebrises.length > 0) {
            planetDebrises.each(function (index, debrisElement) {
                var parentRow = $(debrisElement).parent().parent().parent();
                var debrisFound = _checkDebrisPopup($(debrisElement), galaxy, system, parentRow.parent().children().index(parentRow) + 1, debrisStatus);
                if (debrisFound) {
                    found = true;
                }
            });
        }

        return found;
    }

    window._checkAjaxExpeditionContent = function (data, galaxy, system, debrisStatus) {
        var debrisElement = $(data.galaxy).find('#debris16.galaxyTooltip .ListLinks');
        var found = false;
        if (debrisElement.length > 0) {
            found = _checkDebrisPopup(debrisElement, galaxy, system, 16, debrisStatus);
        }

        return found;
    }

    window._checkDebrisPopup = function (debrisElement, galaxy, system, planet, debrisStatus) {
        var metalValue = _toNumber(debrisElement.find('.debris-content').first().text().split(':')[1]);
        var kristalValue = _toNumber(debrisElement.find('.debris-content').last().text().split(':')[1]);
        var recyclerValue = _toNumber(debrisElement.find('.debris-recyclers').first().text().split(':')[1]);

        var found = false;
        if (kristalValue + metalValue > DEBRIS_ALERT_THRESHOLD) {
            found = true;
            _processFoundDebris(galaxy, system, metalValue, kristalValue, recyclerValue, planet);
            if (debrisStatus) {
                debrisStatus.foundDebrisCount++;
                _storeDebrisCheck(debrisStatus);
            }
        }

        return found;
    }

    window._waitForGalaxyLoad = function (callback, retry = 0) {
        if (retry == 20) {
            var lastWarning = localStorage.getItem('lastLobbyWarning');
            var now = new Date().getTime();
            if (!lastWarning || now - 20000 > parseInt(lastWarning)) {
                _addDesktopAlert('Cant load galaxy, will still retry', 'Maybe we are at lobby, please go back to server for galaxy ' + window.galaxy);
                localStorage.setItem('lastLobbyWarning', now);
            }
        } else if (retry > 0 && retry % 5 == 0) {
            _toNextSystem();
        } else if (retry > 1000) {
            _addDesktopAlert('Cant load galaxy, stopping', 'We stopped retrying please manually resume debris check for galaxy ' + window.galaxy);
            return;
        }

        setTimeout(function () {
            if ($('#galaxyLoading').attr('style') == "display: block;") {
                _waitForGalaxyLoad(callback, ++retry);
            } else {
                callback();
            }
        }, Math.min(retry * Math.random() * 100 + 100, 30000));
    };

    window._goToNearestInactiveSystem = function (diff) {
        if (diff < 0) {
            _toPrevSystem();
        } else {
            _toNextSystem();
        }

        _waitForGalaxyLoad(function () {
            if ($('.row.inactive_filter:not(.vacation_filter)').length == 0) {
                _goToNearestInactiveSystem(diff)
            }
        });
    };

    window._toNextSystem = function () {
        submitOnKey(39);
    };

    window._toPrevSystem = function () {
        submitOnKey(37);
    };

    window._toNextGalaxy = function () {
        submitOnKey(38);
    };

    window._toPrevGalaxy = function () {
        submitOnKey(40);
    };

    window._toGalaxy = function (galaxy) {
        var e = $.Event("keypress", {which: 13});
        $('#galaxy_input').val(galaxy).trigger(e);
    };

    window._toSystem = function (system) {
        var e = $.Event("keypress", {which: 13});
        $('#system_input').val(system).trigger(e);
    };

    window._addGalaxyDebrisInterval();
    window._initGalaxy();

    var autoCheckDebris = _getUrlParameter('check-debris');
    if (autoCheckDebris) {
        _continueDebrisCheck();
    }
    var autoCheckPotentials = _getUrlParameter('check-potentials');
    if (autoCheckPotentials) {
        _checkPotentialDebrisCoords(AJAX_CALL_CONCURRENCY);
    }
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
