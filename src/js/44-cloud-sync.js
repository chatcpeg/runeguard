/* ================= 44-cloud-sync.js · lane N · PostgREST CAS · sync decisions (pure) ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane N writes the real body. */
function cloudStatus(){ return {k:'off', text:'เล่นในเครื่องเท่านั้น'}; }
function cloudPull(){ return Promise.resolve('none'); }
function cloudPush(reason){ return Promise.resolve('offline'); }
function cloudOnLogin(){}
function cloudResolve(choice){}                        // 'local'|'cloud'
function cloudRestoreBackup(){}
function cloudWipe(){}
function syncDecide(localState,srvHead){ return 'noop'; }   // 'adopt'|'push'|'conflict'|'create'|'noop'
function linkDecide(guestSave,srvHead){ return 'noop'; }    // 'adopt'|'askMove'|'choose'|'noop'

