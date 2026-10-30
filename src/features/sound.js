// war.app plays its sounds as HTML audio, often from elements outside the page, so a volume is applied
// where every element's volume is set: each one keeps the volume war.app asked for, times factor(element).
// Returns a function that re-applies it to the sounds played so far, or null when the browser won't allow it.
function scaleAudioVolume(factor) {
    var native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    if (!native || !native.set) {
        return null;
    }
    var asked = new WeakMap();
    var known = [];
    var apply = function (element) {
        if (!asked.has(element)) {
            asked.set(element, native.get.call(element));
        }
        native.set.call(element, asked.get(element) * factor(element));
    };
    Object.defineProperty(HTMLMediaElement.prototype, "volume", {
        configurable: true,
        enumerable: native.enumerable,
        get: function () {
            return this instanceof HTMLAudioElement && asked.has(this) ? asked.get(this) : native.get.call(this);
        },
        set: function (value) {
            if (!(this instanceof HTMLAudioElement)) {
                return native.set.call(this, value);
            }
            asked.set(this, value);
            apply(this);
        }
    });
    var play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
        if (this instanceof HTMLAudioElement) {
            if (known.indexOf(this) === -1) {
                known.push(this);
                if (known.length > 200) {
                    known.shift();
                }
            }
            apply(this);
        }
        return play.apply(this, arguments);
    };
    return function () {
        known.forEach(apply);
    };
}

// war.app's sounds for a new message (GameChat in games, Chat in the chat rooms) and for a turn
// (TurnAdvance, also played when a Quickmatch or other awaited game starts), by file name.
function gameSoundKind(url) {
    var match = /\/Audio\/(GameChat|Chat|TurnAdvance)\.mp3(?:[?#]|$)/i.exec(String(url || ""));
    if (!match) {
        return null;
    }
    return /TurnAdvance/i.test(match[1]) ? "turn" : "chat";
}

// A volume setting's stored percentage as a factor from 0 to 1; full volume when unset or unreadable.
function volumeSettingLevel(value) {
    var percent = typeof value === "number" ? value : parseFloat(value);
    return isNaN(percent) ? 1 : Math.max(0, Math.min(100, percent)) / 100;
}

var GAME_SOUND_SETTINGS = { chat: "chatSoundVolume", turn: "turnSoundVolume" };

function soundSliderHtml(kind, label, title) {
    return '<label class="tuydSoundSlider" data-sound="' + kind + '" title="' + title + ' (Muli\'s Userscript)"><span class="tuydSoundLabel">' + label + '</span>' +
        '<input type="range" min="0" max="100" step="5" aria-label="' + title + '"><span class="tuydSoundValue"></span></label>';
}

function setupGameSoundVolume() {
    var levels = { chat: 1, turn: 1 };
    var refresh = null;
    var channel = typeof BroadcastChannel === "function" ? new BroadcastChannel("tidyUpYourDashboard.soundVolume") : null;
    var apply = function () {
        if (!refresh && (levels.chat < 1 || levels.turn < 1)) {
            refresh = scaleAudioVolume(function (element) {
                var kind = gameSoundKind(element.currentSrc || element.src);
                return kind ? levels[kind] : 1;
            });
        }
        if (refresh) {
            refresh();
        }
    };
    var show = function (scope) {
        $(scope || document).find(".tuydSoundSlider").addBack(".tuydSoundSlider").each(function () {
            var percent = Math.round(levels[$(this).attr("data-sound")] * 100);
            $(this).find("input").val(percent);
            $(this).find(".tuydSoundValue").text(percent + "%");
        });
    };
    // The settings menu saves every input it holds on any change, so it has to hold the level too.
    var setLevel = function (kind, percent) {
        if (!GAME_SOUND_SETTINGS.hasOwnProperty(kind)) {
            return;
        }
        levels[kind] = volumeSettingLevel(percent);
        apply();
        show();
        var input = $("#" + GAME_SOUND_SETTINGS[kind]);
        if (input.length && Number(input.val()) !== Math.round(levels[kind] * 100)) {
            showVolumeSetting(input.val(Math.round(levels[kind] * 100)));
        }
    };
    var tell = function (kind) {
        if (channel) {
            channel.postMessage({ kind: kind, value: Math.round(levels[kind] * 100) });
        }
    };
    var save = function (kind) {
        Database.update(Database.Table.Settings, { name: GAME_SOUND_SETTINGS[kind], value: Math.round(levels[kind] * 100) }, undefined);
        tell(kind);
    };
    var menuKind = function (input) {
        return Object.keys(GAME_SOUND_SETTINGS).filter(function (kind) {
            return GAME_SOUND_SETTINGS[kind] === input.id;
        })[0];
    };
    Promise.all(Object.keys(GAME_SOUND_SETTINGS).map(function (kind) {
        return Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, GAME_SOUND_SETTINGS[kind]).then(function (setting) {
            levels[kind] = volumeSettingLevel(setting && setting.value);
        });
    })).then(function () {
        apply();
        if (channel) {
            channel.onmessage = function (event) {
                setLevel(event.data && event.data.kind, event.data && event.data.value);
            };
        }
        $(document).on("input", "#userscriptMenu .volumeSetting input", function () {
            setLevel(menuKind(this), this.value);
        }).on("change", "#userscriptMenu .volumeSetting input", function () {
            // The menu saves it itself.
            tell(menuKind(this));
        });
        if (pageIsGame() || pageIsChatRoom()) {
            setupSoundSliders(setLevel, save, show);
        }
    });
}

function setupSoundSliders(setLevel, save, show) {
    addCSS(`
        .tuydSoundSlider {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin: 0;
            color: #ddd;
            font-size: 12px;
            font-weight: normal;
            white-space: nowrap;
            pointer-events: auto;
        }
        .tuydSoundSlider input[type=range] {
            width: 80px;
            margin: 0;
            accent-color: #e0c060;
        }
        .tuydSoundValue {
            min-width: 2.8em;
            color: #aaa;
            text-align: right;
        }
        #tuydSoundBtn {
            margin-left: 4px;
            font-size: 12px;
            text-decoration: none;
        }
        #tuydSoundPanel {
            position: fixed;
            z-index: 1060;
            display: flex;
            flex-direction: column;
            gap: 6px;
            padding: 8px 10px;
            border: 1px solid #555;
            border-radius: 4px;
            background: #1b1b1b;
            color: #ddd;
            font-size: 12px;
            pointer-events: auto;
        }
        #tuydSoundPanel .tuydSoundLabel {
            min-width: 3em;
        }
        #tuydSoundPanel .tuydSoundNote {
            color: #888;
            font-size: 11px;
        }
    `);
    $(document).on("input", ".tuydSoundSlider input", function () {
        setLevel($(this).closest(".tuydSoundSlider").attr("data-sound"), this.value);
    }).on("change", ".tuydSoundSlider input", function () {
        save($(this).closest(".tuydSoundSlider").attr("data-sound"));
    }).on("keydown keyup keypress", ".tuydSoundSlider, #tuydSoundPanel", function (event) {
        event.stopPropagation();
    }).on("click", "#tuydSoundBtn", function (event) {
        event.preventDefault();
        if ($("#tuydSoundPanel").length) {
            $("#tuydSoundPanel").remove();
            return;
        }
        var rect = this.getBoundingClientRect();
        var panel = $('<div id="tuydSoundPanel"></div>').append(soundSliderHtml("chat", "Chat", "Chat sound volume"), soundSliderHtml("turn", "Turn", "Turn sound volume"),
            '<div class="tuydSoundNote">On top of war.app\'s App Settings volumes</div>').css({ top: rect.bottom + 6, right: Math.max(8, window.innerWidth - rect.right) });
        $("body").append(panel);
        show(panel);
    }).on("mousedown", function (event) {
        if (!$(event.target).closest("#tuydSoundPanel, #tuydSoundBtn").length) {
            $("#tuydSoundPanel").remove();
        }
    });
    var speaker = $("#SoundContainer");
    if (speaker.length && !$("#tuydSoundBtn").length) {
        speaker.after('<a href="#" id="tuydSoundBtn" title="Volume of the chat and turn sounds (Muli\'s Userscript)">🔔</a>');
    }
}
