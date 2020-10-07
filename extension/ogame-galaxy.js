var fn = function () {
    'use strict';
    if (document.location.href.indexOf('galaxy') === -1) {
        return;
    }

    var self = window;
    window.zoro = window.zoro || {};
    const DEBRIS_ALERT_THRESHOLD = 2000000;
    const DEBRIS_RERUN_DELAY = 300000;

    window._initGalaxy = function () {
        var zoroPanelElement = $('.zoro-check-debris')[0];

        var checkDebrisElement = document.createElement('button');
        checkDebrisElement.innerHTML = "Check For Debris From Start";
        checkDebrisElement.setAttribute('onclick', '_checkDebrisThroughGalaxy(1)');
        zoroPanelElement.appendChild(checkDebrisElement);

        checkDebrisElement = document.createElement('button');
        checkDebrisElement.innerHTML = "Check For Debris From Here";
        checkDebrisElement.setAttribute('onclick', '_checkDebrisThroughGalaxy(window.system)');
        zoroPanelElement.appendChild(checkDebrisElement);

        checkDebrisElement = document.createElement('button');
        checkDebrisElement.innerHTML = "Stop Debris Check";
        checkDebrisElement.setAttribute('onclick', '_stopDebrisCheck()');
        zoroPanelElement.appendChild(checkDebrisElement);
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

    window._checkExpeditionDebris = function (enableAlert) {
        var metalElement = $('.uv-galaxy-expo-debris .debris-content').first();
        var kristalElement = $('.uv-galaxy-expo-debris .debris-content').last();

        var coloredElement = $('.uv-element.uv-galaxy-expo-debris');
        if (metalElement && metalElement.text()) {
            var metalValue = window._toNumber(metalElement.text().split(':')[1]);
            var kristalValue = window._toNumber(kristalElement.text().split(':')[1]);

            window._applyColors(metalValue, kristalValue, coloredElement, coloredElement);

            if (enableAlert && (kristalValue + metalValue > DEBRIS_ALERT_THRESHOLD)) {
                window._processFoundDebris(metalValue, kristalValue, 16);
                zoro.foundDebrisCount++;
            }
        }
    };

    window._checkGalaxyDebris = function (enableAlert) {
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

                    if (enableAlert && (kristalValue + metalValue > DEBRIS_ALERT_THRESHOLD)) {
                        var systemElement = debrisElement.closest('.row');
                        window._processFoundDebris(metalValue, kristalValue, systemElement.parent().children().index(systemElement) + 1);
                        zoro.foundDebrisCount++;
                    }
                }
            });
        }
    };

    window._processFoundDebris = function (kristal, metal, planet) {
        _addLargeDebris(window.galaxy, window.system, planet, metal, kristal);

        var message = 'Please visit system ' + window.galaxy + ':' + window.system + ':' + planet + ' , we have found ' + parseInt(metal / 1000) + 'K metal and ' + parseInt(kristal / 1000) + 'K kristal!';
        _addDesktopAlert('OGame Large Debris Found', message, _getGalaxyUrl(window.galaxy, window.system))
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

    window._checkDebrisThroughGalaxy = function (currentSystem, rerun) {
        currentSystem = parseInt(currentSystem);
        console.log('Lets check debris at galaxy ' + window.galaxy);
        zoro.runningDebris = true;
        zoro.foundDebrisCount = 0;
        _checkDebrisThroughGalaxyRecursive(currentSystem, rerun);
    };

    window._checkDebrisThroughGalaxyRecursive = function (currentSystem, rerun) {
        if (parseInt(currentSystem) >= 500) {
            var message = 'Completed to check galaxy ' + window.galaxy + ' debris and ' + zoro.foundDebrisCount + ' found!';
            if (!rerun || zoro.foundDebrisCount > 0) {
                _addDesktopAlert('Debris Check Completed', message);

                if (rerun) {
                    setTimeout(function () {
                        _checkDebrisThroughGalaxy(1, rerun)
                    }, DEBRIS_RERUN_DELAY * Math.random() + (DEBRIS_RERUN_DELAY / 2));
                }
            } else {
                console.log(message)
            }
        } else if (!zoro.runningDebris) {
            console.log('Debris check stopped at system ' + currentSystem + ' with found debris count ' + zoro.foundDebrisCount);
        } else {
            window._toSystem(currentSystem);

            _waitForGalaxyLoad(function () {
                window._checkGalaxyDebris(true);
                window._checkExpeditionDebris(true);

                _checkDebrisThroughGalaxyRecursive(currentSystem + 1, rerun);
            });
        }
    };

    window._waitForGalaxyLoad = function (callback, retry = 0) {
        if (retry == 10) {
            _addDesktopAlert('Cant load galaxy, will still retry', 'Maybe we are at lobby, please go back to server for galaxy ' + window.galaxy);
        } else if (retry > 0 && retry % 10 == 0) {
            var haydiButton = $('.galaxy_icons.next').last().next();
            haydiButton.click();
        } else if (retry > 100) {
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

    window._toNextSystem = function () {
        $('.galaxy_icons.next').last().click();
    };

    window._toPrevSystem = function () {
        $('.galaxy_icons.prev').last().click();
    };

    window._toNextGalaxy = function () {
        $('.galaxy_icons.next').first().click();
    };

    window._toPrevGalaxy = function () {
        $('.galaxy_icons.prev').first().click();
    };

    window._toGalaxy = function (galaxy) {
        var e = $.Event("keypress", {which: 13});
        $('#galaxy_input').val(galaxy).trigger(e);
    };

    window._toSystem = function (system) {
        var e = $.Event("keypress", {which: 13});
        $('#system_input').val(system).trigger(e);
    };

    window._stopDebrisCheck = function () {
        zoro.runningDebris = false;
    };

    window._addGalaxyDebrisInterval();
    window._initGalaxy();

    var autoCheckDebris = _getUrlParameter('check-debris');
    if (autoCheckDebris) {
        _checkDebrisThroughGalaxy(1, true);
    }
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
