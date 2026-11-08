/* ================= 40-save-schema.js · lane C · pure · save schema, migrate, validate, summary ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane C writes the real body. */
const SCHEMA_V=1;
function newSave(owner){ return {v:SCHEMA_V, owner:owner||null, chars:[]}; }
function newChar(name,clsId){ return null; }
function migrateSave(o,legacyBest){ return newSave(null); }
function validateSave(s){ return s; }
function saveSummary(s){ return {chars:[], play:0, mt:0, appVer:''}; }
function isTrivialSave(s){ return true; }
function uid(prefix){ return String(prefix||''); }

