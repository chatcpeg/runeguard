/* ================= 50-ui-shell.js · lane B · UI router, sheet, toast, confirmBox, sysLog, character window frame ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane B writes the real body. */
const UI={ go(id,args){}, back(){}, home(){}, stack(){ return []; } };
function sheet(nodeOrHtml,o){ return null; }               // o = {title, onClose}
function closeSheet(){}
function toast(text,kind){}                                // kind: 'info'|'good'|'bad'
function confirmBox(text,o){ return Promise.resolve(false); }   // o = {hold, okText}
function sysLog(text,kind){}
function openCharWindow(tab){}
// lane B sets UIX.home / enter / hud / endExtra / pauseExtra here (all null in M0 = old behaviour)

