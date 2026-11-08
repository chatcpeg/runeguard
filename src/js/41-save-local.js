/* ================= 41-save-local.js · lane C · local save (the only file that assigns SAVE) · curChar ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane C writes the real body. */
function loadSaveFor(owner){ return SAVE; }
function saveLocal(reason){}
function saveNow(reason){}
function curChar(){ return null; }
function setActiveChar(id){}
function createChar(name,clsId){ return 'ยังไม่เปิดระบบตัวละคร'; }
function deleteChar(id){ return false; }
function exportSave(){ return ''; }
function importSave(json){ return {ok:false, err:'ยังไม่เปิดระบบเซฟ'}; }
function saveReadOnly(){ return false; }
function loadSettings(){ return {}; }
function saveSettings(patch){}

