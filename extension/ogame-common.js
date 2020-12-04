var fn = function () {
    'use strict';
    if (document.location.href.indexOf('empire') !== -1 ||
        document.location.href.indexOf('board') !== -1) {
        return;
    } else if (document.location.href.indexOf('relogin=1') !== -1) {
        var lastLoginAttempt = localStorage.getItem('last_attempt_for_login');
        if (!lastLoginAttempt || new Date().getTime() - lastLoginAttempt < 5000) {
            window.close();
        }
    }

    window.zoro = window.zoro || {
        debrisCheckStatus: {},
        disablePushNotif: false,
        lobbyInterval: null,
        lobbyCheckMaster: false,
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
            [6, 251, 499],
            [7, 1, 250],
            [7, 251, 499],
            [8, 1, 250],
            [8, 251, 499],
            [9, 1, 250],
            [9, 251, 499]
        ],
        potentialLargeDebrisCoord: [
            // [2, 147],
            // [5, 189],
            // [1, 365],
            // [5, 112]
        ],
        pushover: {
            token: '',
            user: ''
        }
    };

    const LARGE_DEBRIS_KEY = 'zoro-debris';
    const LARGE_DEBRIS_BLACKLIST_KEY = 'zoro-debris-blacklist';
    const NEAR_TO_PLANET_THRESHOLD = 20;
    const MINUTES = 60 * 1000;

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
            runningDebris: true,
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
        debrisListElement.className = 'zoro-debris-list';
        zoroPanelElement.appendChild(debrisListElement);

        _addDebrisLineItems(debrisListElement);

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

    window._addDebrisLineItems = function (debrisListElement) {
        var debrisList = _getLargeDebrisList();
        debrisList.filter(item => item.planet == 16 && !item.collected && !item.ignored).forEach(function (debrisItem) {
            _addDebrisLineItem(debrisItem, debrisListElement);
        });

        debrisList.filter(item => item.planet != 16 && !item.collected && !item.ignored).forEach(function (debrisItem) {
            _addDebrisLineItem(debrisItem, debrisListElement);
        });
    }

    window._cleanLargeDebrisAtSystem = function (galaxy, system, storeTimeElapsed, removeOnlyExpeditions) {
        _getLargeDebrisList().filter(item => item.galaxy == galaxy && item.system == system && (!removeOnlyExpeditions || item.planet == 16)).forEach(function (debrisItem) {
            if (storeTimeElapsed && debrisItem.planet == 16 && !debrisItem.sent) {
                _addTimeElapsed(debrisItem);
            }

            // _removeLargeDebris(debrisItem.galaxy, debrisItem.system, debrisItem.planet);
            _setLargeDebrisFieldValue(debrisItem.galaxy, debrisItem.system, debrisItem.planet, 'fetched', true)
        });
    }

    window._getAverageTimeElapsed = function (galaxy, system, planet) {
        var existingList = _getTimeElapsed(galaxy, system, planet);
        var total = 0;
        existingList.forEach(function (item) {
            total += item;
        });

        return existingList.length > 0 ? _getTimeDiff(total / existingList.length) : 'N/A';
    }

    window._getTimeElapsed = function (galaxy, system, planet) {
        let key = 'timeElapsed_' + _getCoordStr(galaxy, system, planet);
        var existingList = localStorage.getItem(key);
        if (!existingList) {
            existingList = [];
        } else {
            existingList = JSON.parse(existingList);
        }

        return existingList;
    }

    window._addTimeElapsed = function (debrisItem) {
        var timeElapsed = new Date().getTime() - debrisItem.addedAt;
        var existingList = _getTimeElapsed(debrisItem.galaxy, debrisItem.system, debrisItem.planet);
        existingList.push(timeElapsed); // Stores as ms

        let key = 'timeElapsed_' + _getCoordStr(debrisItem.galaxy, debrisItem.system, debrisItem.planet);
        localStorage.setItem(key, JSON.stringify(existingList));
    }

    window._refreshDebrisLineItems = function () {
        var listElement = $('.zoro-debris-list');
        listElement.children().each(function (index, child) {
            child.remove();
        })

        _addDebrisLineItems(listElement[0]);
    };

    window._addDebrisLineItem = function (debrisItem, debrisListElement) {
        var debrisItemElement = document.createElement('li');
        debrisListElement.appendChild(debrisItemElement);

        var blacklisted = _isDebrisSystemBlacklisted(debrisItem.galaxy, debrisItem.system);

        var debrisAnchorElement = document.createElement('a');
        debrisAnchorElement.className = 'zoro-debris-item' + (debrisItem.sent ? ' text-blue' : '') + (blacklisted ? ' text-red' : '');
        debrisAnchorElement.setAttribute('href', _getGalaxyUrl(debrisItem.galaxy, debrisItem.system));
        debrisAnchorElement.innerText = _getCoordStr(debrisItem.galaxy, debrisItem.system, debrisItem.planet)
            + ' ' + number_format(debrisItem.metal / 1000000, 1) + 'M Metal + ' + number_format(debrisItem.kristal / 1000000, 1) + 'M Kristal -- '
            + _getTimeDiff(debrisItem.addedAt) + (debrisItem.fetched ? ' *' : '');
        debrisItemElement.appendChild(debrisAnchorElement);

        if (!debrisItem.sent) {
            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-blue';
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_setLargeDebrisFieldValueClicked(event, '
                + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ', "sent", true)');
            element.innerText = 'S';
            element.title = 'Filo gönderildi';
            debrisItemElement.appendChild(element);

            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-yellow';
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_setLargeDebrisFieldValueClicked(event, '
                + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ', "ignored", true)');
            element.innerText = 'G';
            element.title = 'Gizle';
            debrisItemElement.appendChild(element);
        } else {
            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-green';
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_setLargeDebrisFieldValueClicked(event, '
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

        if (debrisItem.planet === 16 && !_checkPotentialLargeDebrisExists(debrisItem.galaxy, debrisItem.system)) {
            var element = document.createElement('a');
            element.className = 'zoro-debris-action text-white';
            element.setAttribute('href', '#');
            element.setAttribute('onclick', '_addToPotentialLargeDebris(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ')');
            element.innerText = 'P';
            debrisItemElement.appendChild(element);
        }

        var debrisCloseElement = document.createElement('a');
        debrisCloseElement.className = 'zoro-debris-action';
        debrisCloseElement.setAttribute('href', '#');
        debrisCloseElement.setAttribute('onclick', '_removeLargeDebrisClicked(event, ' + debrisItem.galaxy + ',' + debrisItem.system + ',' + debrisItem.planet + ')');
        debrisCloseElement.innerText = 'X';
        debrisItemElement.appendChild(debrisCloseElement);
    }

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
            } else {
                element = document.createElement('button');
                element.style = 'margin-left: 20px;';
                element.innerHTML = "Start";
                element.setAttribute('onclick', '_startDebrisCheck(' + debrisStatus.galaxy + ',' + debrisStatus.startSystem + ', ' + debrisStatus.endSystem + ')');
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

            items.push({
                galaxy: galaxy,
                system: system,
                planet: planet,
                metal: metal,
                kristal: kristal,
                addedAt: new Date().getTime(),
                recycler: recycler,
                fetched: false
            });

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

    window._removeLargeDebrisClicked = function (event, galaxy, system, planet) {
        _removeLargeDebris(galaxy, system, planet);
    }

    window._removeLargeDebris = function (galaxy, system, planet) {
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

    window._setLargeDebrisFieldValueClicked = function (event, galaxy, system, planet, field, value) {
        _setLargeDebrisFieldValue(galaxy, system, planet, field, value)
    };

    window._setLargeDebrisFieldValue = function (galaxy, system, planet, field, value) {
        if (field == 'sent') {
            $(event.target).prev().addClass('text-blue');
        } else if (field == 'collected' || field == 'ignored') {
            $(event.target).closest('li').remove();
        }

        var itemsWithItem = _getLargeDebrisWithItems(galaxy, system, planet);
        var items = itemsWithItem[0];
        var item = itemsWithItem[1];
        item[field] = value;

        _saveLargeDebrisItems(items);

        _refreshDebrisLineItems();
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
        var debrisStatus = _getDebrisCheck(galaxy, startSystem, endSystem);
        debrisStatus.runningDebris = false;
        _storeDebrisCheck(debrisStatus);
    };

    window._startDebrisCheck = function (galaxy, startSystem, endSystem) {
        var debrisStatus = _getDebrisCheck(galaxy, startSystem, endSystem);
        debrisStatus.runningDebris = true;
        _storeDebrisCheck(debrisStatus);
    };

    window._addDesktopAlert = function (title, body, actionUrl, sendPushNotif = false, priority = 0, sound = null) {
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
            _setLastNotificationTime();

            var checkerStatus = _getProcessStatuses();
            if (checkerStatus) {
                body += checkerStatus;
            }

            // Do not warn me before 7 for low priority activities, but do not miss attacks
            if (new Date().getHours() < 7 && priority != 1) {
                priority = -1;
                sound = null;
            }

            $.post('https://api.pushover.net/1/messages.json',
                {
                    token: zoro.pushover.token,
                    user: zoro.pushover.user,
                    device: 'sm-a715f',
                    title: title,
                    message: body,
                    priority: priority,
                    sound: sound ? sound : (priority == -1 ? 'magic' : (priority == -2 ? 'vibrate' : null))
                });
        }
    };

    window._handleLobbyRedirect = function (lobbyCallback) {
        setTimeout(function () {
            var checkIfMaster = localStorage.getItem('last_checker_master');
            if (!checkIfMaster || new Date().getTime() - checkIfMaster > 10000) {
                zoro.lobbyCheckMaster = true;
                console.log('I am the master here! ' + checkIfMaster + ' at ' + new Date())
                localStorage.setItem('last_checker_master', new Date().getTime());
            }
            _tryLogin();

            setTimeout(function () {
                _startLobbyChecker(lobbyCallback);
            }, 2000);
        }, _getUrlParameter('check-potentials') ? 0 : (_getUrlParameter('check-debris') ? 2000 : 1000));
    }

    window._startLobbyChecker = function (lobbyCallback) {
        if (!zoro.lobbyInterval) {
            zoro.lobbyCheckRetry = 0;
            zoro.lobbyInterval = setInterval(function () {
                zoro.lobbyCheckRetry++;

                $.post('/game/index.php?page=ingame&component=galaxyContent&ajax=1', {galaxy: 1, system: 1})
                    .done(function () {
                        if (lobbyCallback) {
                            lobbyCallback();
                        }
                        localStorage.removeItem('last_checker_master');
                        zoro.lobbyCheckMaster = false;
                        clearInterval(zoro.lobbyInterval);
                        zoro.lobbyInterval = null;
                    })
                    .fail(function () {
                        if (zoro.lobbyCheckMaster) {
                            if (zoro.lobbyCheckRetry % 10 == 5) {
                                _tryLogin();
                                return;
                            }

                            if (zoro.lobbyCheckRetry == 0) {
                                if (_checkLastWarned('lobby', 10000)) {
                                    _addDesktopAlert('Redirected to Lobby', 'Seems like we are at lobby please do relogin!');
                                }
                            } else if (zoro.lobbyCheckRetry == 10) {
                                _addDesktopAlert('Redirected to Lobby', 'Seems like we are at lobby please do relogin!', null, true, -2);
                            }
                        }
                    });
            }, (Math.random() * 5000) + 2000);
        }
    };

    window._cleanCoordsStr = function (coordsStr) {
        var coords = coordsStr.replace(/[\[\]]/g, '').split(':');
        return {galaxy: coords[0], system: coords[1], position: coords[2]};
    }

    window._checkLastWarned = function (key, delay) {
        let storageKey = 'last_warned_' + key;
        var lastWarn = localStorage.getItem(storageKey);
        if (!lastWarn || new Date().getTime() - lastWarn > delay) {
            localStorage.setItem(storageKey, new Date().getTime());
            return true;
        }

        return false;
    }

    window._getLastWarned = function (key, delay) {
        let storageKey = 'last_warned_' + key;
        var lastWarn = localStorage.getItem(storageKey);

        return !lastWarn || new Date().getTime() - lastWarn > delay;
    }

    window._tryLogin = function () {
        if (zoro.lobbyCheckMaster) {
            var lastLoginAttempt = localStorage.getItem('last_attempt_for_login');
            let diff = new Date().getTime() - lastLoginAttempt;
            if (!lastLoginAttempt || diff > 60000) {
                // Do try to login
                window.open('https://lobby.ogame.gameforge.com/tr_TR/hub?auto-lobby=1');
                localStorage.setItem('last_attempt_for_login', new Date().getTime());

                if (!_getLastWarned('mobileAction', 30000)) {
                    _addDesktopAlert('Re-logged in After Mobile Activity', 'We detected a recent login activity and after waiting 60sec, we re-logged in!', null, true, -1);
                }
            }

            if (lastLoginAttempt && diff > 10000 && diff < 60000) {
                if (_checkLastWarned('mobileAction', 60000)) {
                    _addDesktopAlert('Mobile Activity Detected', 'Seems like we are at lobby due to mobile activity, we will try in 60 sec!', null, true, -1);
                }
            }
        }
    }

    window._refreshPlanets = function () {
        var planets = fleetDispatcher.planets;
        $('#planetList .smallplanet').each(function (index, element) {
            element = $(element);
            var planetId = element.attr('id').replace('planet-', '');
            var moonHref = element.find('.moonlink').attr('href');
            if (moonHref) {
                var moonId = moonHref.substr(moonHref.indexOf('cp=') + 3)
            }
            var coords = element.find('.planet-koords').text();

            _setPlanetId(planets, coords, planetId, moonId)
        });
        localStorage.setItem('zoro-planets', JSON.stringify(planets))
    }

    window._setPlanetId = function (planets, coords, id, moonId) {
        coords = coords.replace(/[\[\]]/g, '').split(':');

        planets.forEach(function (planet) {
            if (planet.galaxy == coords[0] && planet.system == coords[1] && planet.position == coords[2]) {
                planet['planetId'] = id;
                planet['moonId'] = moonId;
            }
        })
    }

    window._getPlanets = function () {
        var planetsStr = localStorage.getItem('zoro-planets');
        if (planetsStr) {
            return JSON.parse(planetsStr);
        }
        return [];
    }

    window._getPlanetName = function (galaxy, system, position) {
        var result = null;
        _getPlanets().forEach(function (value) {
            if (value.galaxy == galaxy && value.system == system && value.position == position && value.type == 1) {
                result = value.name;
            }
        })
        return result;
    }

    window._getPlanetDetail = function (galaxy, system, position, type) {
        var result = null;
        _getPlanets().forEach(function (value) {
            if (value.galaxy == galaxy && value.system == system && value.position == position && value.type == type) {
                result = value;
            }
        })
        return result;
    }

    window._isNearToMyPlanets = function (galaxy, system, maxDiff = NEAR_TO_PLANET_THRESHOLD) {
        var result = false;
        _getPlanets().forEach(function (value) {
            if (value.galaxy == galaxy && system >= value.system - maxDiff && system <= value.system + maxDiff) {
                result = true;
            }
        })
        return result;
    }

    window._getProcessStatuses = function (addOk) {
        var potentialDebrisCheck = _getPotentialDebrisCheck();
        var potentialStatus = new Date().getTime() - potentialDebrisCheck.lastTime > 900000 ? 'Debris Check: Problem' : (addOk ? '\nDebris Check: OK' : '');

        var fleetStatus = new Date().getTime() - _getFleetLastTime() > 300000 ? 'Fleet Check: Problem' : (addOk ? '\nFleet Check: OK' : '');

        return potentialStatus + fleetStatus;
    }

    window._setLastNotificationTime = function () {
        localStorage.setItem('notification_last_time', new Date().getTime());
    }

    window._getLastNotificationTime = function () {
        return localStorage.getItem('notification_last_time');
    }

    window._setFleetLastTime = function () {
        localStorage.setItem('fleet_check_last_time', new Date().getTime());
    }

    window._getFleetLastTime = function () {
        return localStorage.getItem('fleet_check_last_time');
    }

    window._startCheckerInterval = function () {
        setInterval(function () {
            if (new Date().getTime() - _getLastNotificationTime() > 900000) {
                let status = _getProcessStatuses(true);
                _addDesktopAlert('Checker Statuses', status, null, true, status.indexOf('Problem') !== -1 ? 0 : -1);
            }
        }, 900000); // 15 mins
    };

    window._getMainFleetPlanet = function () {
        return JSON.parse(localStorage.getItem('main_fleet'));
    }

    window._getLastFleetCount = function (galaxy, system, position, type) {
        var count = localStorage.getItem('fleet_count_' + _getCoordStr(galaxy, system, position) + '_' + type);

        return count || 0;
    }

    window._getFleetPageUrl = function (planet) {
        var detail = _getPlanetDetail(planet.galaxy, planet.system, planet.position, planet.type);
        return 'https://s156-tr.ogame.gameforge.com/game/index.php?page=ingame&component=fleetdispatch&cp=' + detail[planet.type == 3 /*MOON*/ ? 'moonId' : 'planetId'];
    }

    window._openMainFleetPage = function (urlSuffix = '') {
        window.open(_getFleetPageUrl(_getMainFleetPlanet()) + urlSuffix);
    }

    window._openFleetPage = function (galaxy, system, position, type, urlSuffix = '') {
        window.open(_getFleetPageUrl({galaxy: galaxy, system: system, position: position, type: type}) + urlSuffix);
    }

    window._pingFleetPage = function (galaxy, system, position, type) {
        console.log('Pinging fleet page for ' + _getCoordStr(galaxy, system, position));
        $.get(_getFleetPageUrl({galaxy: galaxy, system: system, position: position, type: type}));
    }

    window._pingRandomPlanet = function () {
        var planets = _getPlanets();
        var planet = planets[parseInt(planets.length * Math.random())];
        _pingFleetPage(planet.galaxy, planet.system, planet.position, planet.type);
    }

    window._getActiveEvents = function () {
        var events = [];
        $.get('/game/index.php?page=ingame&component=movement')
            .done(function (dataStr) {
                var page = $(dataStr);
                page.find('.fleetDetails').each(function (index, element) {
                    var element = $(element);
                    let origin = _cleanCoordsStr(element.find('.originCoords a').text());
                    origin.type = element.find('.originPlanet .moon') ? 3 : 1;
                    let destination = _cleanCoordsStr(element.find('.destinationCoords a').text());
                    destination.type = element.find('.destinationPlanet .moon').length > 0 ? 3 : (element.find('.destinationPlanet .planetIcon.tf').length > 0 ? 2 : 1);
                    events.push({
                        id: element.attr('id').replace('fleet', ''),
                        origin: origin,
                        destination: destination,
                        mission: parseInt(element.attr('data-mission-type')),
                        returnFlight: element.attr('data-return-flight') == '1',
                        arrivalTime: element.attr('data-arrival-time') * 1000,
                        missionText: element.find('.mission').text(),
                        hostile: element.find('.hostile').length > 0,
                        reversalLink: element.find('.reversal a').length > 0 ? element.find('.reversal a').attr('href') : null
                    });
                });
            });

        return events;
    }

    var autoCheckDebris = _getUrlParameter('check-debris');
    if (location.href.indexOf('lobby') === -1) {
        $('body').addClass('zoro-skin');

        $('body').removeClass('uv-skin-messages');
        $('body').removeClass('uv-feature-spreading');
        $('body').removeClass('uv-feature-quicksearch');

        _initZoroPanel();
        _startCheckerInterval();
    }

    var pingRandomPlanet = _getUrlParameter('ping-random-planet');
    if (pingRandomPlanet) {
        setInterval(function () {
            _pingRandomPlanet();
        }, 5 * MINUTES * Math.random() + (3 * MINUTES));
    }

    var autoClose = _getUrlParameter('auto-close');
    if (autoClose) {
        setTimeout(function () {
            window.close();
        }, parseInt(autoClose) * 1000);
    }

    zoro.disablePushNotif = _getUrlParameter('disable-push');
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);