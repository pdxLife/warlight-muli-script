const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createDom, load, domGlobals, flush, source } = require("./harness");

const SUFFIXES = eval("(" + source.match(/var IDLE_NUMBER_SUFFIXES = ([^\n]*);/)[1] + ")");
const FUNCTIONS = ["parseIdleNumber", "parseIdleMoney", "shownUjsElement", "formatIdleMoney", "idleMarketRates", "idleMarketPrices", "idleMarketCost", "idleCheapestPurchase", "idleTechCostRows"];

// Mirrors Idle's Items tab market rows and a tech's details box (names and numbers are invented or
// copied from a real level).
function marketRow(n, market, items) {
    return `<div id="ujs_WziTabBodyMarketRow_${n}"><div id="ujs_NameLabel_${n}"><div class="ujsInner ujsTextInner">${market}</div></div><div id="ujs_ResourcesContainer_${n}">`
        + items.map((item, i) => `<div id="ujs_ResourceLabelContainer_${n}${i}"><div class="ujsText"><div class="ujsInner ujsTextInner">${item}</div></div></div>`).join("") + `</div></div>`;
}

function techDialog(name, rows) {
    return `<div id="ujs_WziTabBodyTechDialog"><div id="ujs_Header"><div class="ujsGameObject ujsText" id="ujs_NameLabel_9" style="bottom: 5px;"><div class="ujsInner ujsTextInner">${name}</div></div></div>`
        + `<div id="ujs_CostContainer">` + rows.map(([counts, item], i) => `<div id="ujs_horz_${i}"><div class="ujsGameObject ujsImg"></div>`
            + `<div class="ujsGameObject ujsText" id="ujs_Text_${i}a"><div class="ujsInner ujsTextInner">${counts}</div></div>`
            + `<div class="ujsGameObject ujsText" id="ujs_Text_${i}b" style="bottom: 1px;"><div class="ujsInner ujsTextInner">${item}</div></div></div>`).join("") + `</div></div>`;
}

const MARKETS = marketRow(1, "Belluminkling", ["Tin Bar for ￦1.46K", "Copper Bar for ￦45", "Iron Bar for ￦21K", "Zinc Bar for ￦127K"])
    + marketRow(2, "Cleakuwaked", ["Silver Bar for ￦31M", "Gold Bar for ￦77M", "Metal Pipe for ￦44M", "Platinum Bar for ￦181M"])
    + marketRow(3, "Other", ["Copper Bar for ￦60"]);

const SAVE = `<AssetsOwned><di __k="Gaspo" ID="Gaspo" Type="WziAssetMine" MineLevel="6"/>`
    + `<di __k="Belluminkling" ID="Belluminkling" UpgradeCosts="" Type="WziAssetMarket" MarketIndex="1" Resources="102;2.89271820554383e-7|101;1.00051254811995e-8|103;0.00000461151240102341|104;0.0000292903952578563" Multiplier="0.938666544" ResourceTypesAvailable="102,101,103,104"/>`
    + `<di __k="Cleakuwaked" ID="Cleakuwaked" Type="WziAssetMarket" Resources="301;0.0001|302;0.0002|303;0.00000108|304;0.0003" Multiplier="0.9" ResourceTypesAvailable="301,302,303,304"/></AssetsOwned>`;

function setup(html) {
    const { dom, $ } = createDom(html, "https://war.app/Idle/Play");
    return { ctx: load(FUNCTIONS, { ...domGlobals(dom, $), IDLE_NUMBER_SUFFIXES: SUFFIXES }), $ };
}

test("reads each market's multiplier and per-item price rise from Idle's save, in the order the market lists them", () => {
    const { ctx } = setup("");
    const rates = JSON.parse(JSON.stringify(ctx.idleMarketRates(SAVE)));
    assert.deepEqual(Object.keys(rates), ["Belluminkling", "Cleakuwaked"]);
    assert.equal(rates.Belluminkling.multiplier, 0.938666544);
    assert.deepEqual(rates.Belluminkling.items.map((i) => i.id), ["102", "101", "103", "104"]);
    assert.equal(rates.Belluminkling.items[1].rate, 1.00051254811995e-8);
    assert.deepEqual(JSON.parse(JSON.stringify(ctx.idleMarketRates("not a save"))), {});
});

test("reads the markets and prices from the Items tab", () => {
    const { ctx } = setup(MARKETS);
    const prices = JSON.parse(JSON.stringify(ctx.idleMarketPrices()));
    assert.equal(prices.length, 3);
    assert.deepEqual(prices[0], { market: "Belluminkling", items: [{ name: "Tin Bar", price: 1460 }, { name: "Copper Bar", price: 45 }, { name: "Iron Bar", price: 21000 }, { name: "Zinc Bar", price: 127000 }] });
});

test("prices rise by the same step for each one bought, as Idle's market shows", () => {
    const { ctx } = setup("");
    // Idle's own market said "Purchase 1M for ￦45M" and "Purchase 30M for ￦1.56B" for Copper Bar at ￦45.
    assert.equal(Math.round(ctx.idleMarketCost(45, 1.00051254811995e-8, 0.938666544, 1e6) / 1e6), 45);
    assert.equal(Math.round(ctx.idleMarketCost(45, 1.00051254811995e-8, 0.938666544, 3e7) / 1e7) / 100, 1.57);
    assert.equal(ctx.idleMarketCost(10, 0, 1, 7), 70, "without the save it's today's price");
});

test("picks the cheapest market that sells the item, and says when none does", () => {
    const { ctx } = setup(MARKETS);
    const prices = ctx.idleMarketPrices();
    const rates = ctx.idleMarketRates(SAVE);
    const copper = JSON.parse(JSON.stringify(ctx.idleCheapestPurchase("Copper Bar", 100, prices, rates)));
    assert.equal(copper.market, "Belluminkling");
    assert.equal(copper.exact, true);
    const other = JSON.parse(JSON.stringify(ctx.idleCheapestPurchase("Copper Bar", 100, [prices[2]], rates)));
    assert.deepEqual(other, { market: "Other", cost: 6000, exact: false }, "a market missing from the save is priced at today's price");
    assert.equal(ctx.idleCheapestPurchase("Welding Rod", 27, prices, rates), null);
});

test("reads have/need from a tech's details box, with K and M counts", () => {
    const { ctx, $ } = setup(techDialog("TNT", [["218/1.25K", "Copper Wire"], ["0/27", "Welding Rod"]]));
    const rows = ctx.idleTechCostRows($("#ujs_WziTabBodyTechDialog")[0]).map((r) => [r.name, r.have, r.need]);
    assert.deepEqual(JSON.parse(JSON.stringify(rows)), [["Copper Wire", 218, 1250], ["Welding Rod", 0, 27]]);
});

test("formats money the way Idle does", () => {
    const { ctx } = setup("");
    assert.deepEqual([45, 1460, 33.4e6, 220.5e6, 1.566e9, 9.8e9].map((n) => ctx.formatIdleMoney(n)), ["₩45", "₩1.46K", "₩33.4M", "₩221M", "₩1.57B", "₩9.8B"]);
});

test("puts the missing count and cost beside each short item, and a total on the tech's name line", async () => {
    const { dom, $ } = createDom(MARKETS + techDialog("Prefab Assembly", [["218/722", "Copper Bar"], ["119/183", "Metal Pipe"], ["90/50", "Tin Bar"]])
        + `<div id="ujs_MoneyLabel"><div class="ujsTextInner">￦9.8B (176K/sec)</div></div>`, "https://war.app/Idle/Play");
    dom.window.Range.prototype.getBoundingClientRect = () => ({ right: 100, left: 0 });
    const timers = [];
    const ctx = load(FUNCTIONS.concat(["readIdleSave", "setupIdleTechCost"]), {
        ...domGlobals(dom, $),
        IDLE_NUMBER_SUFFIXES: SUFFIXES,
        addCSS: () => { },
        setTimeout: (fn) => { timers.push(fn); return 1; },
        indexedDB: { databases: () => Promise.resolve([]) }
    });
    ctx.setupIdleTechCost();
    $("#ujs_CostContainer").append("<i></i>");
    await flush();
    timers.splice(0).forEach((fn) => fn());
    const hints = $(".idleTechCost").map((i, e) => $(e).text()).get();
    assert.deepEqual(Array.from(hints).sort(), ["all ≈ ₩2.82B", "need 504 more ≈ ₩22.7K", "need 64 more ≈ ₩2.82B"].sort(), "the Tin Bar row has enough and gets nothing");
    assert.ok($(".idleTechCostTotal").hasClass("idleTechCostShort") === false, "₩9.8B is enough");
});
