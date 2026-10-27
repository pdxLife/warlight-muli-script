const { test } = require("node:test");
const assert = require("node:assert/strict");
const { functionSources, createDom, load, domGlobals, flush } = require("./harness");

const CDN = "https://warappcdn.com/Audio/";

test("war.app's chat and turn sounds are told apart by file name", () => {
    const ctx = load(["gameSoundKind"]);
    assert.equal(ctx.gameSoundKind(CDN + "GameChat.mp3"), "chat");
    assert.equal(ctx.gameSoundKind(CDN + "Chat.mp3?v=3"), "chat", "the chat rooms' sound");
    assert.equal(ctx.gameSoundKind(CDN + "TurnAdvance.mp3"), "turn");
    for (const other of ["ClockTick.mp3", "Attack.mp3", "Wzi/WziMoney.mp3", "GameChat.mp3.bak"]) {
        assert.equal(ctx.gameSoundKind(CDN + other), null, other);
    }
    assert.equal(ctx.gameSoundKind(""), null);
    assert.equal(ctx.gameSoundKind(undefined), null);
});

test("a stored volume percentage becomes a factor, full volume when unset", () => {
    const ctx = load(["volumeSettingLevel"]);
    assert.equal(ctx.volumeSettingLevel(40), 0.4);
    assert.equal(ctx.volumeSettingLevel("0"), 0);
    assert.equal(ctx.volumeSettingLevel(250), 1);
    assert.equal(ctx.volumeSettingLevel(-5), 0);
    assert.equal(ctx.volumeSettingLevel(undefined), 1);
    assert.equal(ctx.volumeSettingLevel(true), 1, "not a number");
});

const SOUND_FUNCTIONS = ["setupGameSoundVolume", "setupSoundSliders", "soundSliderHtml", "gameChatSoundSpot", "scaleAudioVolume", "gameSoundKind", "volumeSettingLevel",
    "showVolumeSetting", "openGameChatTabRect", "shownUjsElement", "pageIsGame", "pageIsChatRoom"];

function gamePage(stored, { html = "", url = "https://war.app/MultiPlayer?GameID=1", BroadcastChannel } = {}) {
    const { dom, $ } = createDom(html, url);
    const { HTMLMediaElement, HTMLAudioElement } = dom.window;
    const native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    const play = HTMLMediaElement.prototype.play;
    const updates = [];
    const Database = {
        Table: { Settings: "Settings" },
        Row: { Settings: { Name: "name" } },
        readIndex: (table, row, name) => Promise.resolve(name in stored ? { name, value: stored[name] } : undefined),
        update: (table, value) => {
            updates.push(value);
            return Promise.resolve();
        }
    };
    const ctx = load(SOUND_FUNCTIONS, {
        ...domGlobals(dom, $), HTMLMediaElement, HTMLAudioElement, Database, location: dom.window.location, addCSS: () => {},
        setTimeout: () => 0, GAME_SOUND_SETTINGS: { chat: "chatSoundVolume", turn: "turnSoundVolume" }, BroadcastChannel
    });
    const sound = (file) => {
        const audio = new dom.window.Audio();
        audio.src = CDN + file;
        return audio;
    };
    const restore = () => {
        Object.defineProperty(HTMLMediaElement.prototype, "volume", native);
        HTMLMediaElement.prototype.play = play;
    };
    return { ctx, dom, $, sound, updates, nativeVolume: (el) => native.get.call(el), native, restore };
}

test("the chat and turn sounds play at their own share of the volume war.app sets", async () => {
    const { ctx, dom, sound, nativeVolume, restore } = gamePage({ chatSoundVolume: 40, turnSoundVolume: 0 });
    const early = sound("GameChat.mp3");
    early.volume = 0.5;
    ctx.setupGameSoundVolume();
    await flush();

    const chat = sound("GameChat.mp3");
    chat.volume = 0.8;
    assert.equal(chat.volume, 0.8, "war.app reads back what it set");
    assert.ok(Math.abs(nativeVolume(chat) - 0.32) < 1e-9, "the browser plays it at 40%");
    const turn = sound("TurnAdvance.mp3");
    turn.volume = 0.8;
    assert.equal(nativeVolume(turn), 0, "0% silences it");
    const attack = sound("Attack.mp3");
    attack.volume = 0.8;
    assert.equal(nativeVolume(attack), 0.8, "other sounds keep war.app's volume");
    const video = dom.window.document.createElement("video");
    video.src = CDN + "GameChat.mp3";
    video.volume = 0.8;
    assert.equal(nativeVolume(video), 0.8, "videos are left alone");

    early.play();
    assert.ok(Math.abs(nativeVolume(early) - 0.2) < 1e-9, "a sound war.app set up before the script keeps its volume, scaled when it plays");
    restore();
});

test("at full volume for both, nothing is changed", async () => {
    for (const stored of [{}, { chatSoundVolume: 100, turnSoundVolume: 100 }]) {
        const { ctx, dom, native, restore } = gamePage(stored);
        const play = dom.window.HTMLMediaElement.prototype.play;
        ctx.setupGameSoundVolume();
        await flush();
        assert.deepEqual(Object.getOwnPropertyDescriptor(dom.window.HTMLMediaElement.prototype, "volume"), native);
        assert.equal(dom.window.HTMLMediaElement.prototype.play, play);
        restore();
    }
});

test("the sound button next to war.app's speaker opens both sliders, which apply at once and are saved", async () => {
    const html = `<span><div id="SoundContainer"><a href="#"><img></a></div></span><input id="chatSoundVolume" type="range"><span class="volumeSettingValue"></span>`;
    const { ctx, $, sound, updates, nativeVolume, restore } = gamePage({ turnSoundVolume: 50 }, { html });
    const chat = sound("GameChat.mp3");
    ctx.setupGameSoundVolume();
    await flush();

    assert.equal($("#SoundContainer + #tuydSoundBtn").length, 1, "right after war.app's speaker icon");
    $("#tuydSoundBtn").trigger("click");
    assert.deepEqual($("#tuydSoundPanel .tuydSoundSlider").map((i, el) => $(el).text()).get(), ["Chat100%", "Turn50%"]);
    chat.volume = 0.8;
    assert.equal(nativeVolume(chat), 0.8, "chat at 100% keeps war.app's volume");
    chat.play();

    $("#tuydSoundPanel [data-sound=chat] input").val("30").trigger("input");
    assert.ok(Math.abs(nativeVolume(chat) - 0.24) < 1e-9, "a sound already played follows the slider");
    assert.equal($("#tuydSoundPanel [data-sound=chat]").text(), "Chat30%");
    $("#tuydSoundPanel [data-sound=chat] input").trigger("change");
    assert.deepEqual(JSON.parse(JSON.stringify(updates)), [{ name: "chatSoundVolume", value: 30 }]);
    assert.equal($("#chatSoundVolume").val(), "30", "the settings menu holds the new value, so saving the menu keeps it");
    assert.equal($(".volumeSettingValue").text(), "30%");

    $("body").trigger($.Event("mousedown", { target: $("body")[0] }));
    assert.equal($("#tuydSoundPanel").length, 0, "a click elsewhere closes it");
    restore();
});

test("the chat rooms' toolbar gets the chat sound slider; other pages get no buttons", async () => {
    const room = gamePage({ chatSoundVolume: 40 }, { html: `<div id="SoundContainer"></div><div id="tuydChatTools"></div>`, url: "https://war.app/MultiPlayer?ChatRoom=1" });
    room.ctx.setupGameSoundVolume();
    await flush();
    assert.equal(room.$("#tuydChatTools > .tuydSoundSlider[data-sound=chat]").text(), "🔔40%");
    assert.equal(room.$("#tuydSoundBtn").length, 1);
    room.restore();

    const dashboard = gamePage({ chatSoundVolume: 40 }, { html: `<div id="SoundContainer"></div>`, url: "https://war.app/MultiPlayer/" });
    dashboard.ctx.setupGameSoundVolume();
    await flush();
    assert.equal(dashboard.$(".tuydSoundSlider, #tuydSoundBtn").length, 0);
    const chat = dashboard.sound("Chat.mp3");
    chat.volume = 1;
    assert.equal(dashboard.nativeVolume(chat), 0.4, "the volume still applies there");
    dashboard.restore();
});

// Tabs of one browser: a message reaches the other channels of the same name, never the sender.
function channelHub() {
    const open = [];
    return class FakeChannel {
        constructor(name) {
            this.name = name;
            open.push(this);
        }
        postMessage(data) {
            open.filter((other) => other !== this && other.name === this.name && other.onmessage)
                .forEach((other) => other.onmessage({ data: JSON.parse(JSON.stringify(data)) }));
        }
    };
}

test("a volume set in one tab applies at once in the other open tabs, and in their settings menus", async () => {
    const BroadcastChannel = channelHub();
    const menu = `<div id="userscriptMenu"><label class="volumeSetting"><input id="chatSoundVolume" type="range"><span class="volumeSettingValue"></span></label>`
        + `<label class="volumeSetting"><input id="turnSoundVolume" type="range"><span class="volumeSettingValue"></span></label></div>`;
    const game = gamePage({}, { html: `<div id="SoundContainer"></div>` + menu, BroadcastChannel });
    const dashboard = gamePage({}, { html: menu, url: "https://war.app/MultiPlayer/", BroadcastChannel });
    game.ctx.setupGameSoundVolume();
    dashboard.ctx.setupGameSoundVolume();
    await flush();
    const ding = dashboard.sound("GameChat.mp3");
    ding.volume = 0.8;
    ding.play();

    game.$("#tuydSoundBtn").trigger("click");
    game.$("#tuydSoundPanel [data-sound=chat] input").val("25").trigger("input").trigger("change");
    ding.volume = 0.8;
    ding.play();
    assert.ok(Math.abs(dashboard.nativeVolume(ding) - 0.2) < 1e-9, "the other tab's next ding follows");
    assert.equal(dashboard.$("#chatSoundVolume").val(), "25", "and its menu, so saving it there keeps 25%");
    assert.equal(dashboard.$("#chatSoundVolume + .volumeSettingValue").text(), "25%");
    assert.equal(game.updates.length, 1, "saved once");
    assert.equal(dashboard.updates.length, 0, "not again by the other tab");

    dashboard.$("#turnSoundVolume").val("0").trigger("input").trigger("change");
    const turn = dashboard.sound("TurnAdvance.mp3");
    turn.volume = 1;
    assert.equal(dashboard.nativeVolume(turn), 0, "the menu's slider applies at once in its own tab");
    game.$("#tuydSoundBtn").trigger("click").trigger("click");
    assert.equal(game.$("#tuydSoundPanel [data-sound=turn]").text(), "Turn0%", "and in the other tab's sliders");
    assert.equal(game.$("#turnSoundVolume").val(), "0");
    game.restore();
    dashboard.restore();
});

test("the game chat's slider sits right of the open chat's tab", () => {
    const ctx = load(["gameChatSoundSpot"]);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.gameChatSoundSpot({ left: 473, right: 548, bottom: 420.4, height: 17.4 }, 760))), { left: 556, bottom: 340, height: 17 });
});

test("a volume setting shows as a slider in the menu and is saved as a number", async () => {
    const { dom, $ } = createDom(`<div id="userscriptMenu"><div class="modal-body"></div></div>`);
    const stored = { chatSoundVolume: { name: "chatSoundVolume", value: 40 } };
    const updates = [];
    const Database = {
        Table: { Settings: "Settings" },
        Row: { Settings: { Name: "name" } },
        update(table, value) {
            updates.push(value);
            return Promise.resolve();
        },
        readIndex(table, row, name, cb) {
            cb(stored[name]);
        }
    };
    const settings = [
        { id: "confirmCommit", text: "Ask Before Committing Orders", selected: false, section: "Games" },
        { id: "chatSoundVolume", text: "Chat Sound Volume", volume: true, selected: 100, section: "Games" },
        { id: "turnSoundVolume", text: "Turn Sound Volume", volume: true, selected: 100, section: "Games" }
    ];
    const ctx = load([...functionSources.keys()], {
        ...domGlobals(dom, $),
        localStorage: dom.window.localStorage,
        DISABLED_FEATURES_KEY: "tidyUpYourDashboard.disabledFeatures",
        MENU_SECTIONS: [["Games", "Games"]],
        Database,
        userscriptSettings: settings,
        logData: ""
    });
    $("#userscriptMenu .modal-body").append(ctx.renderMenuSections(settings, [], [], ["Games"], () => ""));
    ctx.checkUserscriptMenuButtons();

    assert.equal($("#chatSoundVolume").attr("type"), "range");
    assert.equal($("#chatSoundVolume").val(), "40");
    assert.equal($("#chatSoundVolume").closest(".settingsListItem").text(), "Chat Sound Volume40%");
    assert.equal($("#turnSoundVolume").val(), "100", "unset is full volume");
    assert.equal($("#confirmCommit").attr("type"), "checkbox");

    $("#turnSoundVolume").val("25");
    ctx.storeSettingsVariables();
    await flush();
    const saved = Object.fromEntries(updates.filter((u) => u.name).map((u) => [u.name, u.value]));
    assert.equal(saved.turnSoundVolume, 25);
    assert.equal(saved.chatSoundVolume, 40);
    assert.equal(saved.confirmCommit, false);
});
