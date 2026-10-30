function commitQuestion(link) {
    var match = /^ujs_(CommitBtn|RunAndCommitBtn)(?:_\d+)?_btn$/.exec(link && link.id || "");
    if (!match) {
        return null;
    }
    return match[1] === "RunAndCommitBtn" ? "Let Autopilot make your orders and commit them?" : "Commit your orders for this turn?";
}

function setupCommitConfirm() {
    document.addEventListener("click", function (event) {
        var link = $(event.target).closest("a.ujsBtnInner")[0];
        var question = commitQuestion(link);
        if (question && !window.confirm(question)) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
}
