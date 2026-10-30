function setupDatabase() {
    log("indexedDB start setup");
    var db = null;
    var settingsCache = null;

    function request(table, mode, operation) {
        return new Promise(function (resolve, reject) {
            var req = operation(db.transaction([table], mode).objectStore(table));
            req.onsuccess = function (e) {
                resolve(e.target.result);
            };
            req.onerror = function (e) {
                reject(e.target.error);
            };
        });
    }

    function settle(promise, callback, description) {
        promise.then(function (result) {
            if (typeof callback === "function") {
                callback(result);
            }
        }).catch(function (error) {
            log("Database error in " + description + ": " + error);
        });
        return promise;
    }

    function isSettings(table) {
        return table === Database.Table.Settings && settingsCache !== null;
    }
    window.Database = {
        Table: {
            Bookmarks: "Bookmarks",
            Settings: "Settings",
            BlacklistedForumThreads: "BlacklistedForumThreads",
            TournamentData: "TournamentData",
            QuickmatchTemplates: "QuickmatchTemplates"
        },
        Exports: {
            Bookmarks: "Bookmarks",
            Settings: "Settings",
            BlacklistedForumThreads: "BlacklistedForumThreads"
        },
        Row: {
            BlacklistedForumThreads: {
                ThreadId: "threadId",
                Date: "date"
            },
            Bookmarks: {
                Order: "order"
            },
            Settings: {
                Name: "name"
            },
            TournamentData: {
                Id: "tournamentId"
            },
            QuickmatchTemplates: {
                Id: "setId"
            }
        },
        init: function (callback) {
            log("indexedDB start init");
            if (!("indexedDB" in window)) {
                log("IndexedDB not supported");
                return;
            }
            var openRequest = indexedDB.open("TidyUpYourDashboard_v3", 7);
            openRequest.onupgradeneeded = function (e) {
                var thisDB = e.target.result;
                if (!thisDB.objectStoreNames.contains("Bookmarks")) {
                    var objectStore = thisDB.createObjectStore("Bookmarks", { autoIncrement: true });
                    objectStore.createIndex("order", "order", { unique: true });
                }
                if (!thisDB.objectStoreNames.contains("Settings")) {
                    var objectStore = thisDB.createObjectStore("Settings", { keyPath: "name" });
                    objectStore.createIndex("name", "name", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("BlacklistedForumThreads")) {
                    var objectStore = thisDB.createObjectStore("BlacklistedForumThreads", { autoIncrement: true });
                    objectStore.createIndex("threadId", "threadId", { unique: true });
                    objectStore.createIndex("date", "date", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("TournamentData")) {
                    var objectStore = thisDB.createObjectStore("TournamentData", { keyPath: "tournamentId" });
                    objectStore.createIndex("tournamentId", "tournamentId", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
                if (!thisDB.objectStoreNames.contains("QuickmatchTemplates")) {
                    var objectStore = thisDB.createObjectStore("QuickmatchTemplates", {
                        keyPath: "setId",
                        autoIncrement: true
                    });
                    objectStore.createIndex("setId", "setId", { unique: true });
                    objectStore.createIndex("value", "value", { unique: false });
                }
            };

            openRequest.onsuccess = function (e) {
                log("indexedDB init sucessful");
                db = e.target.result;
                var loadSettings = request(Database.Table.Settings, "readonly", function (store) {
                    return store.getAll();
                }).then(function (settings) {
                    settingsCache = {};
                    settings.forEach(function (setting) {
                        settingsCache[setting.name] = setting;
                    });
                }, function (error) {
                    log("Could not cache settings: " + error);
                });
                settle(loadSettings, callback, "init");
            };
            openRequest.onblocked = function (e) {
                log("indexedDB blocked");
            };

            openRequest.onerror = function (e) {
                log("Error Init IndexedDB");
                log(e.target.error)
            }
        },
        update: function (table, value, key, callback) {
            if (isSettings(table)) {
                settingsCache[value.name] = structuredClone(value);
            }
            var saved = request(table, "readwrite", function (store) {
                return key == undefined ? store.put(value) : store.put(value, Number(key));
            }).then(function (result) {
                log(`Saved ${JSON.stringify(value).slice(0, 300)} in ${table}`);
                return result;
            });
            return settle(saved, callback, "update " + table);
        },
        read: function (table, key, callback) {
            return settle(request(table, "readonly", function (store) {
                return store.get(Number(key));
            }), callback, "read " + table);
        },
        readIndex: function (table, row, value, callback) {
            if (isSettings(table) && row === Database.Row.Settings.Name) {
                var cached = settingsCache[value];
                return settle(Promise.resolve(cached && structuredClone(cached)), callback, "readIndex " + table);
            }
            return settle(request(table, "readonly", function (store) {
                return store.index(row).get(value);
            }), callback, "readIndex " + table);
        },
        readAll: function (table, callback) {
            var all = new Promise(function (resolve, reject) {
                var items = [];
                var req = db.transaction([table], "readonly").objectStore(table).openCursor();
                req.onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        var item = cursor.value;
                        item.id = cursor.primaryKey;
                        items.push(item);
                        cursor.continue();
                    } else {
                        resolve(items);
                    }
                };
                req.onerror = function (e) {
                    reject(e.target.error);
                };
            });
            return settle(all, callback, "readAll " + table);
        },
        add: function (table, value, callback) {
            if (isSettings(table)) {
                settingsCache[value.name] = structuredClone(value);
            }
            var added = request(table, "readwrite", function (store) {
                return store.add(value);
            }).then(function (result) {
                log(`Saved ${JSON.stringify(value)} in ${table}`);
                return result;
            });
            return settle(added, callback, "add " + table);
        },
        delete: function (table, key, callback) {
            if (isSettings(table)) {
                delete settingsCache[key];
            }
            return settle(request(table, "readwrite", function (store) {
                return store.delete(key);
            }), callback, "delete " + table);
        },
        clear: function (table, callback) {
            if (isSettings(table)) {
                settingsCache = {};
            }
            return settle(request(table, "readwrite", function (store) {
                return store.clear();
            }), callback, "clear " + table);
        }
    }
}

// A setting added after a user's first run has no stored value yet, so it takes its default.
function readSettingValue(name, fallback, callback) {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, name, function (setting) {
        callback(setting && setting.value !== undefined ? setting.value : fallback);
    });
}

function setupSettingsDatabase() {
    wljs_WaitDialogJS.Start(null, "Setting up Muli's Userscript...")

    Promise.all(userscriptSettings.map(function (set) {
        return Database.update(Database.Table.Settings, { name: set.id, value: set.selected });
    })).then(function () {
        sessionStorage.setItem("showUserscriptMenu", true);
        window.setTimeout(function () {
            window.location.reload();
        }, 2000)
    })
}

function ifSettingIsEnabled(setting, positive, negative, cb) {
    Database.readIndex(Database.Table.Settings, Database.Row.Settings.Name, setting, function (setting) {
        if (setting && setting.value) {
            positive();
            if (typeof cb == "function") {
                cb();
            }
        } else {
            if (typeof negative == 'function') {
                negative();
            }
            if (typeof cb == 'function') {
                cb();
            }
        }
    })
}
