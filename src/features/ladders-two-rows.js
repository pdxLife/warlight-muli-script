// War.app writes these elements' positions inline at every layout, so !important rules hold them without
// watching it, and they stay war.app's own rows. Two rows side by side need about 1,200px; with less, its one
// column stands. Its rows change width with the layout and height with their text, so both are set here.
function setupLaddersTwoRows() {
    var section = "[id^='ujs_LaddersScene'] [id^='ujs_Section']";
    addCSS(`
        #UjsCanvasHolder:has([id^='ujs_LaddersScene']) { container: tuydLaddersArea / inline-size; }
        @container tuydLaddersArea (min-width: 1198px) {
            [id^='ujs_LaddersScene'] [id^='ujs_Viewport'] { overflow: visible !important; }
            ${section} { transform: translate(-292px, -154px); }
            ${section} [id^='ujs_DialogBackgroundForDropShadow'][id$='_img'] { width: 1166px !important; height: 215px !important; }
            ${section} > [id^='ujs_Intro'] { left: 297px !important; bottom: 171px !important; }
            ${section} > [id^='ujs_LadderContainer'] > [id$='_img'] { width: 569px !important; height: 72px !important; }
            ${section} > [id^='ujs_LadderContainer'] > [id^='ujs_Vert'] [id$='_tmp'] { width: 389px !important; }
            ${section} > [id='ujs_LadderContainer'], ${section} > [id^='ujs_LadderContainer_'], ${section} > [id^='ujs_LadderContainer3'] { bottom: 91px !important; }
            ${section} > [id^='ujs_LadderContainer1'], ${section} > [id^='ujs_LadderContainer2'] { bottom: 5px !important; }
            ${section} > [id^='ujs_LadderContainer3'], ${section} > [id^='ujs_LadderContainer2'] { left: 589px !important; }
        }
    `);
}
