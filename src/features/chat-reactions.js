// War.app opens its React picker from a click on a chat message's bubble: on the bubble's transparent
// click-catcher (<bubble id>_pch), or on its text outside links. Game chat's bubble is RightCol, a chat room's BubbleImage.
function chatReactionBubble(target) {
    var $target = $(target);
    var bubble = $target.closest(".ujsPCH");
    if (!bubble.length || !/^ujs_(?:RightCol|BubbleImage)(?:_\d+)?$/.test(bubble[0].id)) {
        return null;
    }
    if (!bubble.parent().closest("[id^='ujs_ChatMessage'], [id^='ujs_ChatRoomMessageControl']").length) {
        return null;
    }
    if (target.id === bubble[0].id + "_pch") {
        return bubble[0];
    }
    var text = $target.closest(".ujsTextInner");
    if (text.length && /^ujs_Message(?:Label)?(?:_\d+)?_tmp$/.test(text[0].id) && !$target.closest(".ujsTMPLink").length) {
        return bubble[0];
    }
    return null;
}

function setupChatAltClickReact() {
    document.addEventListener("click", function (event) {
        if (!chatReactionBubble(event.target)) {
            return;
        }
        if (!event.altKey) {
            event.stopImmediatePropagation();
            event.stopPropagation();
            return;
        }
        // War.app skips the click while any text is selected, and Alt-click doesn't clear a selection.
        var selection = document.getSelection();
        if (selection && !selection.isCollapsed) {
            selection.removeAllRanges();
        }
    }, true);
}
