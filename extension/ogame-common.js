var fn = function () {
    'use strict';
    if (document.location.href.indexOf('empire') !== -1 ||
        document.location.href.indexOf('board') !== -1) {
        return;
    } else if (location.href.indexOf('lobby') !== -1) {
        setTimeout(function () {
            // console.log(document.getElementById('joinGame').childNodes.length)
            // document.getElementById('joinGame').childNodes[1].click();
            // setTimeout(function () {
            //     // window.close();
            // }, 3000);
        }, 2000);
        return;
    }

    window.zoro = window.zoro || {
        debrisCheckStatus: {},
        disablePushNotif: false,
        lobbyInterval: null,
        galaxySystemMap: [
            [1, 1, 250],
            [1, 251, 499],
            [2, 1, 250],
            [2, 251, 499],
            [3, 1, 250],
            [3, 251, 499],
            [4, 1, 250],
            [4, 251, 499],
            [5, 1, 250],
            [5, 251, 499],
            [6, 1, 250],
            [6, 251, 499]
        ],
        potentialLargeDebrisCoord: [
            // [2, 147],
            // [5, 189],
            // [1, 365],
            // [5, 112]
        ],

    };

    const LARGE_DEBRIS_KEY = 'zoro-debris';
    const LARGE_DEBRIS_BLACKLIST_KEY = 'zoro-debris-blacklist';

    $('body').addClass('zoro-skin');

    $('body').removeClass('uv-skin-messages');
    $('body').removeClass('uv-feature-spreading');
    $('body').removeClass('uv-feature-quicksearch');

    window._storeDebrisCheck = function (debrisCheck) {
        localStorage.setItem('debris_check_' + debrisCheck.galaxy + ':' + debrisCheck.startSystem + ':' + debrisCheck.endSystem, JSON.stringify(debrisCheck));
    };

    window._toNumber = function (str) {
        return parseInt(str.replaceAll('.', ''));
    };

    window._calculateColorRed = function (value, baseThreshold, level1 = 3, level2 = 6) {
        var clazz = '';
        if (value >= baseThreshold * level2) {
            clazz = 'text-brown';
        } else if (value >= baseThreshold * level1) {
            clazz = 'text-coral';
        } else if (value >= baseThreshold) {
            clazz = 'text-burlywood';
        }

        return clazz;
    }

    window._calculateColorGreen = function (value, baseThreshold, level1 = 3, level2 = 6) {
        var clazz = '';
        if (value >= baseThreshold * level2) {
            clazz = 'text-dark-green';
        } else if (value >= baseThreshold * level1) {
            clazz = 'text-green';
        } else if (value >= baseThreshold) {
            clazz = 'text-light-green';
        }

        return clazz;
    }

    window._getDebrisCheck = function (galaxy, startSystem, endSystem) {
        var json = localStorage.getItem('debris_check_' + galaxy + ':' + startSystem + ':' + endSystem);
        if (json != null) {
            return JSON.parse(json);
        }

        return {
            galaxy: galaxy,
            currentSystem: startSystem,
            startSystem: startSystem,
            endSystem: endSystem,
            runningDebris: false,
            lastTime: null,
            foundDebrisCount: 0
        };
    };

    window._storePotentialDebrisCheck = function (debrisCheck) {
        localStorage.setItem('debris_large_potential_check', JSON.stringify(debrisCheck));
    };

    window._getPotentialDebrisCheck = function () {
        var json = localStorage.getItem('debris_large_potential_check');
        if (json != null) {
            return JSON.parse(json);
        }

        return {
            lastTime: null,
            potentialList: [],
            potentials: []
        };
    };

    window._updatePotentialDebrisItem = function (galaxy, system) {
        var debrisCheck = _getPotentialDebrisCheck();

        if (debrisCheck.potentials) {
            debrisCheck.potentials.forEach(function (item) {
                if (item.galaxy == galaxy && item.galaxy == system) {
                    item.lastTime = new Date().getTime();
                    item.foundDebrisCount++;

                    _storePotentialDebrisCheck(debrisCheck);
                }
            })
        }
    };

    window._setDebrisSystemBlacklisted = function (event, galaxy, system,) {
        localStorage.setItem(LARGE_DEBRIS_BLACKLIST_KEY + '-' + galaxy + '-' + system, 'true');
        $(event.target).closest('li').children().first().addClass('text-red');
        $(event.target).closest('li').find('.zoro-debris-action.text-green').removeClass('display-none');
        $(event.target).closest('li').find('.zoro-debris-action.text-red').addClass('display-none');
    };

    window._setDebrisSystemWhitelisted = function (event, galaxy, system) {
        localStorage.removeItem(LARGE_DEBRIS_BLACKLIST_KEY + '-' + galaxy + '-' + system);
        $(event.target).closest('li').children().first().removeClass('text-red');
        $(event.target).closest('li').find('.zoro-debris-action.text-green').addClass('display-none');
        $(event.target).closest('li').find('.zoro-debris-action.text-red').removeClass('display-none');
    };

    window._isDebrisSystemBlacklisted = function (galaxy, system) {
        return localStorage.getItem(LARGE_DEBRIS_BLACKLIST_KEY + '-' + galaxy + '-' + system) || false;
    };

    window._addToPotentialLargeDebris = function (event, galaxy, system) {
        if (!_checkPotentialLargeDebrisExists(galaxy, system)) {
            var debrisCheck = _getPotentialDebrisCheck();

            debrisCheck.potentials = debrisCheck.potentials || [];
            debrisCheck.potentials.push({galaxy: galaxy, system: system, lastTime: null, foundCount: 0});

            _storePotentialDebrisCheck(debrisCheck);
        }
    };

    window._checkPotentialLargeDebrisExists = function (galaxy, system) {
        var debrisCheck = _getPotentialDebrisCheck();

        var result = false;
        if (debrisCheck.potentials) {
            debrisCheck.potentials.forEach(function (item) {
                if (item.galaxy == galaxy && item.system == system) {
                    result = true;
                }
            })
        }

        return result;
    };


    window._initZoroPanel = function () {
        var zoroPanelElement = document.createElement('div');
        zoroPanelElement.className = 'zoro-check-debris';
        document.body.appendChild(zoroPanelElement);

        var debrisListElement = document.createElement('ul');
        zoroPanelElement.appendChild(debrisListElement);

        var debrisList = _getLargeDebrisList();
        debrisList.forEach(function (debrisItem) {
            if (debrisItem.collected) {
                return;
            }

            var debrisItemElement = document.createElement('li');
            debrisListElement.appendChild(debrisItemElement);

            var blacklisted = _isDebrisSystemBlacklisted(debrisItem.galaxy, debrisItem.system);

            var debrisAnchorElement = document.createElement('a');
            debrisAnchorElement.className = 'zoro-debris-item' + (debrisItem.sent ? ' text-blue' : '') + (blacklisted ? ' text-red' : '');
            debrisAnchorElement.setAttribute('href', _getGalaxyUrl(debrisItem.galaxy, debrisItem.system));
            debrisAnchorElement.innerText = _getCoordStr(debrisItem.galaxy, debrisItem.system, debrisItem.planet)
                + ' ' + number_format(debrisItem.metal / 1000000, 1) + 'M Metal + ' + number_format(debrisItem.kristal / 1000000, 1) + 'M Kristal -- '
                + _getTimeDiff(debrisItem.addedAt);
            debrisItemElement.appendChild(debrisAnchorElement);

            if (!debrisItem.sent) {
                var element = document.createElement('a');
                element.className = 'zoro-debris-action text-blue';
                element.setAttribute('href', '#');
                element.setAttribute('onclick', '_setLargeDebrisFieldValue(event, '
                    + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ', "sent", true)');
                element.innerText = 'S';
                element.title = 'Filo gönderildi';
                debrisItemElement.appendChild(element);
            } else {
                var element = document.createElement('a');
                element.className = 'zoro-debris-action text-green';
                element.setAttribute('href', '#');
                element.setAttribute('onclick', '_setLargeDebrisFieldValue(event, '
                    + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ', "collected", true)');
                element.innerText = 'T';
                element.title = 'Enkaz Toplandı';
                debrisItemElement.appendChild(element);
            }

            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-green' + (blacklisted ? '' : ' display-none');
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_setDebrisSystemWhitelisted(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ')');
            element.innerText = 'W';
            debrisItemElement.appendChild(element);

            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-red' + (blacklisted ? ' display-none' : '');
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_setDebrisSystemBlacklisted(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ')');
            element.innerText = 'B';
            debrisItemElement.appendChild(element);

            if (!_checkPotentialLargeDebrisExists(debrisItem.galaxy, debrisItem.system)) {
                var element = document.createElement('a');
                element.className = 'zoro-debris-action text-yellow';
                element.setAttribute('href', '#');
                element.setAttribute('onclick', '_addToPotentialLargeDebris(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ')');
                element.innerText = 'P';
                debrisItemElement.appendChild(element);
            }

            var debrisCloseElement = document.createElement('a');
            debrisCloseElement.className = 'zoro-debris-action';
            debrisCloseElement.setAttribute('href', '#');
            debrisCloseElement.setAttribute('onclick', '_removeLargeDebris(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ')');
            debrisCloseElement.innerText = 'X';
            debrisItemElement.appendChild(debrisCloseElement);
        });

        var runCheckDebrisElement = document.createElement('div');
        zoroPanelElement.appendChild(runCheckDebrisElement);

        var runCheckDebrisLabelElement = document.createElement('div');
        runCheckDebrisLabelElement.innerHTML = 'Run checker for each galaxy'
        runCheckDebrisElement.appendChild(runCheckDebrisLabelElement);

        zoro.galaxySystemMap.forEach(function (galaxySystem) {
            runCheckDebrisElement.appendChild(_createDebrisCheckElement(_getDebrisCheck(galaxySystem[0], galaxySystem[1], galaxySystem[2])));
        });

        runCheckDebrisElement.appendChild(_createPotentialLargeDebrisCheckElement());

        if (_getLargeDebrisList().length > 0) {
            var element = document.createElement('button');
            element.innerHTML = "Clean Debris List";
            element.setAttribute('onclick', '_cleanDebrisList()');
            zoroPanelElement.appendChild(element);
        }
    };

    window._createDebrisCheckElement = function (debrisStatus) {
        var runCheckDebrisLineElement = document.createElement('div');
        runCheckDebrisLineElement.id = 'debris-line-' + debrisStatus.galaxy + '-' + debrisStatus.startSystem + '-' + debrisStatus.endSystem;

        var element = document.createElement('button');
        element.style = 'width: 90px;';
        element.innerHTML = "G" + debrisStatus.galaxy + ':' + debrisStatus.startSystem + ':' + debrisStatus.endSystem;
        if (autoCheckDebris) {
            element.setAttribute('onclick', '_checkDebrisThroughGalaxy(' + debrisStatus.galaxy + ',' + debrisStatus.startSystem + ', ' + debrisStatus.endSystem + ', true)');
        }
        runCheckDebrisLineElement.appendChild(element);

        element = document.createElement('label');
        element.innerHTML = _getTimeDiff(debrisStatus.lastTime);
        element.className = 'zoro-galaxy-run-label';
        runCheckDebrisLineElement.appendChild(element);

        element = document.createElement('label');
        element.innerHTML = debrisStatus.foundDebrisCount;
        element.style = 'margin-left:20px;'
        runCheckDebrisLineElement.appendChild(element);

        element = document.createElement('label');
        element.innerHTML = debrisStatus.currentSystem;
        element.style = 'margin-left:20px;'
        runCheckDebrisLineElement.appendChild(element);

        if (autoCheckDebris) {
            if (debrisStatus.runningDebris) {
                element = document.createElement('button');
                element.style = 'margin-left: 20px;';
                element.innerHTML = "Stop";
                element.setAttribute('onclick', '_stopDebrisCheck(' + debrisStatus.galaxy + ',' + debrisStatus.startSystem + ', ' + debrisStatus.endSystem + ')');
                runCheckDebrisLineElement.appendChild(element);
            }
        }

        return runCheckDebrisLineElement;
    }

    window._createPotentialLargeDebrisCheckElement = function () {
        var runCheckDebrisLineElement = document.createElement('div');
        runCheckDebrisLineElement.id = 'debris-line-potential-checks';

        var element = document.createElement('button');
        element.style = 'width: 90px;';
        element.innerHTML = "Potentials";
        runCheckDebrisLineElement.appendChild(element);

        element = document.createElement('label');
        element.innerHTML = _getTimeDiff(_getPotentialDebrisCheck().lastTime);
        element.className = 'zoro-galaxy-run-label';
        runCheckDebrisLineElement.appendChild(element);

        return runCheckDebrisLineElement;
    }

    window._getUrlParameter = function (sParam, defaultValue = null) {
        var sPageURL = window.location.search.substring(1),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
            }
        }

        return defaultValue;
    };

    window._getTimeDiff = function (time) {
        if (!time) {
            return 'N/A';
        }

        var now = new Date().getTime();

        var since = parseInt((now - time) / (1000 * 60));
        var sinceMinute = since % 60;
        var diff = parseInt(since / 60) + ':' + (sinceMinute > 9 ? sinceMinute : '0' + sinceMinute);

        return diff;
    };

    window._addLargeDebris = function (galaxy, system, planet, metal, kristal, recycler) {
        var existing = _getLargeDebris(galaxy, system, planet);
        if (!existing) {
            var items = _getLargeDebrisList();

            items.push({galaxy: galaxy, system: system, planet: planet, metal: metal, kristal: kristal, addedAt: new Date().getTime(), recycler: recycler});

            _saveLargeDebrisItems(items);

            return true;
        }

        return false;
    };

    window._getLargeDebrisList = function () {
        var existing = localStorage.getItem(LARGE_DEBRIS_KEY);
        var items = [];
        if (existing) {
            items = JSON.parse(existing);
        }

        return items;
    };

    window._removeLargeDebris = function (event, galaxy, system, planet) {
        var itemsWithItem = _getLargeDebrisWithItems(galaxy, system, planet);
        var items = itemsWithItem[0];
        var item = itemsWithItem[1];
        if (item) {
            items.splice(items.indexOf(item), 1);
            $(event.target).closest('li').remove();
            _saveLargeDebrisItems(items);
        }
    };

    window._cleanDebrisList = function () {
        _saveLargeDebrisItems([]);
    };

    window._getLargeDebris = function (galaxy, system, planet) {
        return _getLargeDebrisWithItems(galaxy, system, planet)[1];
    };

    window._getLargeDebrisWithItems = function (galaxy, system, planet) {
        var items = _getLargeDebrisList();

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if (item.galaxy == galaxy && item.system == system && item.planet == planet) {
                return [items, item];
            }
        }

        return [items, null];
    };

    window._setLargeDebrisFieldValue = function (event, galaxy, system, planet, field, value) {
        if (field == 'sent') {
            $(event.target).prev().addClass('text-blue');
        } else if (field == 'collected') {
            $(event.target).closest('li').remove();
        }

        var itemsWithItem = _getLargeDebrisWithItems(galaxy, system, planet);
        var items = itemsWithItem[0];
        var item = itemsWithItem[1];
        item[field] = value;

        _saveLargeDebrisItems(items);
    };

    window._saveLargeDebrisItems = function (items) {
        localStorage.setItem(LARGE_DEBRIS_KEY, JSON.stringify(items));
    }

    window._getCoordStr = function (galaxy, system, planet) {
        return galaxy + ':' + system + ':' + planet;
    };

    window._getGalaxyUrl = function (galaxy, system, suffix = '') {
        return location.origin + location.pathname + '?page=ingame&component=galaxy&galaxy=' + galaxy + '&system=' + system + suffix;
    };

    window._stopDebrisCheck = function (galaxy, startSystem, endSystem) {
        var debrisStatus = zoro.debrisCheckStatus[galaxy + ':' + startSystem + ':' + endSystem];
        debrisStatus.runningDebris = false;
        _storeDebrisCheck(debrisStatus);
    };

    window._startDebrisCheck = function (galaxy, startSystem, endSystem) {
        var debrisStatus = zoro.debrisCheckStatus[galaxy + ':' + startSystem + ':' + endSystem];
        debrisStatus.runningDebris = true;
        _storeDebrisCheck(debrisStatus);
    };

    window._addDesktopAlert = function (title, body, actionUrl, sendPushNotif = false) {
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

        if (sendPushNotif && !zoro.disablePushNotif) {
            $.post('https://api.pushover.net/1/messages.json',
                {
                    token: zoro.pushover.token,
                    user: zoro.pushover.user,
                    device: 'sm-a715f',
                    title: title,
                    message: body
                });
        }
    };

    window._handleLobbyRedirect = function (lobbyCallback) {
        var lastWarn = localStorage.getItem('last_warned_for_lobby');
        if (!lastWarn || new Date().getTime() - lastWarn > 10000) {
            _addDesktopAlert('Redirected to Lobby', 'Seems like we are at lobby please do relogin!');
            localStorage.setItem('last_warned_for_lobby', new Date().getTime());
        }
        _startLobbyChecker(lobbyCallback);
    }

    window._startLobbyChecker = function (lobbyCallback) {
        if (!zoro.lobbyInterval) {
            zoro.lobbyCheckRetry = 0;
            zoro.lobbyInterval = setInterval(function () {
                $.post('/game/index.php?page=ingame&component=galaxyContent&ajax=1', {galaxy: 1, system: 1})
                    .done(function () {
                        if (lobbyCallback) {
                            lobbyCallback();
                        }
                        clearInterval(zoro.lobbyInterval);
                        zoro.lobbyInterval = null;
                    });
            }, Math.min(zoro.lobbyCheckRetry++ * (Math.random() * 5000) + 3000, 30000));
        }
    };

    var autoLobby = _getUrlParameter('auto-lobby', false);
    var autoCheckDebris = _getUrlParameter('check-debris');
    _initZoroPanel();

    if (autoLobby) {
        setInterval(function () {
            window.location.reload();
        }, Math.random() * 3000 + 2000);
    }
    zoro.disablePushNotif = _getUrlParameter('disable-push');
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
