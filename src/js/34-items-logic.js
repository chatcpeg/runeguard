/* ================= 34-items-logic.js · lane E · pure per ch/acct · bag, equip, refine, runes, drops, shop ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane E writes the real body. */
function itemDef(id){ return null; }
function itemName(inst){ return ''; }
function makeInst(id,o){ return null; }                    // o = {sockets}
function invAdd(ch,idOrInst,n){ return {ok:false, overflow:0}; }
function invRemove(ch,idOrUid,n){ return false; }
function invCount(ch,id){ return 0; }
function canEquip(ch,inst){ return 'ยังไม่เปิดระบบอุปกรณ์'; }
function equip(ch,uid){ return 'ยังไม่เปิดระบบอุปกรณ์'; }
function unequip(ch,slot){ return 'ยังไม่เปิดระบบอุปกรณ์'; }
function gearBonus(ch){ return {}; }
function gearLook(ch){ return {}; }
function refineInfo(inst){ return null; }                  // → {to, p, mat, fee, onFail}
function refineTry(ch,uid,o){ return {res:'keep', from:0, to:0, p:0}; }   // o = {seal} · real one uses rngUnit()
function socketRune(ch,uid,runeId,i){ return 'ยังไม่เปิดระบบรูน'; }
function unsocketRune(ch,uid,i){ return 'ยังไม่เปิดระบบรูน'; }
function combineShards(ch,shardId){ return ''; }
function rollDrops(table,luckMul){ return []; }
function buyItem(ch,id,n){ return 'ร้านยังไม่เปิด'; }
function sellItem(ch,idOrUid,n){ return 0; }
function sellAllCommon(ch){ return 0; }
function useConsumable(ch,id){ return false; }
function stashMove(ch,uid,toStash){ return 'คลังยังไม่เปิด'; }

