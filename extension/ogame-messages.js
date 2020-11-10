var fn = function () {
    'use strict';
    if (document.location.href.indexOf('messages') === -1) {
        return;
    }
    const MILLION = 1000000;
    const GANIMET_ALERT_THRESHOLD_FOR_INACTIVE = 2 * MILLION;
    const FILO_ALERT_THRESHOLD_FOR_INACTIVE = 5 * MILLION;
    const GANIMET_ALERT_THRESHOLD_FOR_ACTIVE = 20 * MILLION;
    const FILO_ALERT_THRESHOLD_FOR_ACTIVE = 30 * MILLION;

    window._kmToNumber = function (valueStr) {
        return _toNumber(valueStr.replace('m', '.000').replace('M', '.000000'));
    }

    window._isActiveUser = function (messageElement) {
        return messageElement.find('.status_abbr_longinactive').length == 0 && messageElement.find('.status_abbr_inactive').length == 0;
    };

    window._checkGanimet = function (messageElement) {
        var ganimetSpan = messageElement.find('.msg_content .compacting.uv-element span');
        if (ganimetSpan.length > 0) {
            var ganimetSpanStr = ganimetSpan.text();

            var ganimet = _kmToNumber((ganimetSpanStr.split('|')[0]).split(':')[1]);
            var ganimetClazz = '';
            if (!_isActiveUser(messageElement)) { // Inactive user
                ganimetClazz = _calculateColorGreen(ganimet, GANIMET_ALERT_THRESHOLD_FOR_INACTIVE);
            } else { // Active User
                ganimetClazz = _calculateColorGreen(ganimet, GANIMET_ALERT_THRESHOLD_FOR_ACTIVE);
            }
            ganimetSpan.addClass(ganimetClazz);
        }
    }

    window._checkFleet = function (messageElement) {
        var fleetSavunmaLineElement = messageElement.find('.msg_content .compacting:last()');
        if (fleetSavunmaLineElement.length > 0) {
            var filoSpan = fleetSavunmaLineElement.find('span.tooltipLeft.ctn.ctn4');
            var savunmaSpan = fleetSavunmaLineElement.find('span.fright.tooltipRight ');
            var filoSpanStr = filoSpan.text();
            var savunmaSpanStr = savunmaSpan.text();

            var filo = _kmToNumber(filoSpanStr.split(':')[1]);
            var savunma = _kmToNumber(savunmaSpanStr.split(':')[1]);
            var filoClazz = '';
            var savunmaClazz = '';
            if (!_isActiveUser(messageElement)) { // Inactive user
                filoClazz = _calculateColorGreen(filo, FILO_ALERT_THRESHOLD_FOR_INACTIVE);
                savunmaClazz = _calculateColorRed(savunma, 1, 1000, 100000);
            } else { // Active User
                filoClazz = _calculateColorGreen(filo, FILO_ALERT_THRESHOLD_FOR_ACTIVE);
                savunmaClazz = _calculateColorRed(savunma, 1, 1000, 100000);
                if (filoClazz != '' && filo > savunma * 10) {
                    filoClazz = 'text-brown';
                }
            }

            filoSpan.addClass(filoClazz);
            savunmaSpan.addClass(savunmaClazz);
        }
    }

    window._checkMessageContents = function () {
        $('#fleetsgenericpage:not(.zoro-message-color) > ul > li').each(function (index, messageElement) {
            messageElement = $(messageElement);

            _checkGanimet(messageElement);
            _checkFleet(messageElement);
        });

        $('#fleetsgenericpage').addClass('zoro-message-color');
    }

    window._addMessagesInterval = function _addMessagesInterval() {
        if (document.location.href.indexOf('messages') === -1) {
            return;
        }

        setInterval(function () {
            _checkMessageContents();
        }, 100);
    };
    window._addMessagesInterval();
};

var script = document.createElement('script');
script.textContent = '(' + fn + ')()';
(document.head || document.documentElement).appendChild(script);
script.parentNode.removeChild(script);
