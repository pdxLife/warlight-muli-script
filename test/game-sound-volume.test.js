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

function gamePage(stored) {
    const { dom, $ } = createDom("", "https://war.app/MultiPlayer?GameID=1");
    const { HTMLMediaElement, HTMLAudioElement } = dom.window;
    const native = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
    const play = HTMLMediaElement.prototype.play;
    const Database = {
        Table: { Settings: "Settings" },
        Row: { Settings: { Name: "name" } },
        readIndex: (table, row, name) => Promise.resolve(name in stored ? { name, value: stored[name] } : undefined)
    };
    const ctx = load(["setupGameSoundVolume", "scaleAudioVolume", "gameSoundKind", "volumeSettingLevel"], {
        ...domGlobals(dom, $), HTMLMediaElement, HTMLAudioElement, Database
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
    return { ctx, dom, sound, nativeVolume: (el) => native.get.call(el), native, restore };
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
