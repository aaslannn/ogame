var fn = function () {
    'use strict';
    if (document.location.href.indexOf('galaxy') === -1) {
        return;
    }

    var self = window;
    window.zoro = window.zoro || {};
    const DEBRIS_ALERT_THRESHOLD = 2000000;
    const DEBRIS_RERUN_DELAY = 10000;
    const DEBRIS_RUN_NEXT_SYSTEM_DELAY = 100;

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

    window._toNumber = function (str) {
        return parseInt(str.replaceAll('.', ''));
    };

    window._applyColors = function (metalValue, kristalValue, zoroElement, coloredElement) {
        var clazz = null;
        if (metalValue > 10000000 || kristalValue > 10000000) {
            clazz = 'text-brown';
        } else if (metalValue > 5000000 || kristalValue > 5000000) {
            clazz = 'text-coral';
        } else if (metalValue > 1000000 || kristalValue > 1000000) {
            clazz = 'text-burlywood';
        }
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
            var message = 'Please visit system ' + galaxy + ':' + system + ':' + planet + ' , we have found ' + parseInt(metal / 1000) + 'K metal and ' + parseInt(kristal / 1000) + 'K kristal!';
            _addDesktopAlert('OGame Large Debris Found', message, _getGalaxyUrl(galaxy, system));
        }
    };

    window._addDesktopAlert = function (title, body, actionUrl) {
        console.log(body);
        var notification = new Notification(title, {
            icon: 'https://s165-tr.ogame.gameforge.com/favicon.ico',
            body: body,
        });
        if (actionUrl) {
            notification.onclick = function () {
                window.open(actionUrl);
            };
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
            _checkGalaxyDebrisWithAjax(debrisStatus, rerun, function () {
                setTimeout(function () {
                    debrisStatus.currentSystem++;
                    _storeDebrisCheck(debrisStatus);
                    _checkDebrisThroughGalaxyRecursive(debrisStatus, rerun);
                }, Math.random() * DEBRIS_RUN_NEXT_SYSTEM_DELAY);
            });
        }
    };

    window._checkGalaxyDebrisWithAjax = function (debrisStatus, rerun, callback) {
        $.post('/game/index.php?page=ingame&component=galaxyContent&ajax=1', {galaxy: debrisStatus.galaxy, system: debrisStatus.currentSystem})
            .done(function (dataStr) {
                var data = JSON.parse(dataStr);
                _checkAjaxExpeditionContent(data, debrisStatus);
                _checkAjaxPlanetDebrisContent(data, debrisStatus);

                if (callback) {
                    callback();
                }
            })
            .fail(function (xhr, status, error) {
                if (status == 'error') {
                    _startLobbyChecker();
                }
            });
    }

    window._startLobbyChecker = function () {
        if (!zoro.lobbyInterval) {
            zoro.lobbyCheckRetry = 0;
            zoro.lobbyInterval = setInterval(function () {
                $.post('/game/index.php?page=ingame&component=galaxyContent&ajax=1', {galaxy: 1, system: 1})
                    .done(function () {
                        _continueDebrisCheck();
                        clearInterval(zoro.lobbyInterval);
                        zoro.lobbyInterval = null;
                    });
            }, Math.min(zoro.lobbyCheckRetry++ * (Math.random() * 5000) + 3000, 30000));
        }
    };

    window._continueDebrisCheck = function () {
        zoro.galaxySystemMap.forEach(function (galaxySystem) {
            let debrisStatus = _getDebrisCheck(galaxySystem[0], galaxySystem[1], galaxySystem[2]);

            if (debrisStatus.runningDebris) {
                _checkDebrisThroughGalaxyRecursive(debrisStatus, true);
            }
        });
    };

    window._checkAjaxPlanetDebrisContent = function (data, debrisStatus) {
        var planetDebrises = $(data.galaxy).find('td.debris .galaxyTooltip .ListLinks');
        if (planetDebrises.length > 0) {
            planetDebrises.each(function (index, debrisElement) {
                var parentRow = $(debrisElement).parent().parent().parent();
                _checkDebrisPopup($(debrisElement), debrisStatus, parentRow.parent().children().index(parentRow));
            });
        }
    }

    window._checkAjaxExpeditionContent = function (data, debrisStatus) {
        var debrisElement = $(data.galaxy).find('#debris16.galaxyTooltip .ListLinks');
        if (debrisElement.length > 0) {
            _checkDebrisPopup(debrisElement, debrisStatus, 16);
        }
    }

    window._checkDebrisPopup = function (debrisElement, debrisStatus, planet) {
        var metalValue = _toNumber(debrisElement.find('.debris-content').first().text().split(':')[1]);
        var kristalValue = _toNumber(debrisElement.find('.debris-content').last().text().split(':')[1]);
        var recyclerValue = _toNumber(debrisElement.find('.debris-recyclers').first().text().split(':')[1]);

        if ((kristalValue + metalValue > DEBRIS_ALERT_THRESHOLD)) {
            _processFoundDebris(debrisStatus.galaxy, debrisStatus.currentSystem, metalValue, kristalValue, recyclerValue, planet);
            debrisStatus.foundDebrisCount++;
            _storeDebrisCheck(debrisStatus);
        }
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
        // zoro.galaxySystemMap.forEach(function (galaxySystem) {
        //     _checkDebrisThroughGalaxy(galaxySystem[0], galaxySystem[1], galaxySystem[2], true);
        // });

        // setInterval(function () {
        //     zoro.galaxySystemMap.forEach(function (galaxySystem) {
        //         var oldStatus = zoro.debrisCheckStatus[galaxySystem[0], galaxySystem[1], galaxySystem[2]];
        //         var newStatus = window._getDebrisCheck(galaxySystem[0], galaxySystem[1], galaxySystem[2]);
        //         if (oldStatus.runningDebris != newStatus.runningDebris) {
        //             if (newStatus.runningDebris) {
        //                 _checkDebrisThroughGalaxy(galaxySystem[0], galaxySystem[1], galaxySystem[2], true);
        //             }
        //             console.log("Detected status change for " + galaxySystem[0] + ':' + galaxySystem[1] + ':' + galaxySystem[2])
        //         }
        //     });
        // }, 5000);
    }
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
