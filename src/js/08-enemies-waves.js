const EN={
 shambler:{n:'ซอมบี้',hp:16,speed:46,r:13,dmg:8,mass:1,xp:1,goo:'#7fae5a'},
 runner:{n:'ซอมบี้วิ่ง',hp:10,speed:98,r:11,dmg:6,mass:.8,xp:1,goo:'#a84040',accel:7},
 bat:{n:'ค้างคาว',hp:7,speed:135,r:9,dmg:4,mass:.4,xp:1,goo:'#8a5aaa',erratic:1,fly:1,accel:8},
 spitter:{n:'โครงกระดูกนักธนู',hp:24,speed:52,r:12,dmg:6,mass:.9,xp:2,goo:'#e9e2cf',ranged:1,keep:250,shotCd:2.6,shotSp:210,shotDmg:7,bones:1},
 bloater:{n:'ศพพอง',hp:40,speed:40,r:17,dmg:10,mass:2,xp:3,goo:'#a8d14f',blast:{r:78,dmg:20}},
 brute:{n:'ยักษ์ศพ',hp:110,speed:38,r:22,dmg:18,mass:5,xp:5,goo:'#8a7aa8'},
 wraith:{n:'วิญญาณ',hp:32,speed:72,r:13,dmg:9,mass:.6,xp:3,goo:'#a7c7ff',phase:1},
 colossus:{boss:1,n:'ยักษ์กระดูกทมิฬ',hp:1800,speed:60,r:44,dmg:24,mass:80,xp:150,goo:'#e9e2cf',bones:1},
 lich:{boss:1,n:'ลิชไร้วิญญาณ',hp:4800,speed:66,r:30,dmg:18,mass:60,xp:220,goo:'#a46bff'},
 king:{boss:1,n:'จักรพรรดิแห่งความตาย',hp:30000,speed:74,r:50,dmg:32,mass:120,xp:500,goo:'#d8444c'},
};
function waveCfg(w){const W={shambler:10};if(w>=2)W.runner=3+w*.4;if(w>=3)W.bat=2.5;if(w>=4)W.spitter=1.4+w*.12;if(w>=5)W.brute=.8+w*.15;if(w>=6)W.bloater=1.6;if(w>=8)W.wraith=1.8+w*.05;
  return {W,rate:.7+w*.34+w*w*.028,hpMul:1+(w-1)*.17+(w-1)*(w-1)*.026,dmgMul:1+(w-1)*.07,spdMul:1+Math.min(.25,(w-1)*.013)};}
const xpNeed=L=>Math.round(4+(L-1)*3.5+(L-1)*(L-1)*.3);

